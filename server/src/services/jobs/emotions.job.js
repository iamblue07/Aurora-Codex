/**
 * Scores the emotional tone of book descriptions (anger … neutral, 0–1) with an instruction-tuned
 * language model that reads the Romanian descriptions directly.
 *
 * Speed: several books go into one request (`emotions.batchSize`), and several requests run at
 * once (`emotions.concurrency`). The instructions are sent once per batch instead of once per book,
 * so a batch costs little more than a single book and the catalogue is scored many times faster.
 * A book whose answer is missing or invalid in a batch is retried alone, so one bad answer never
 * loses the others. By default only books without scores are processed.
 */
import { Op, Sequelize } from 'sequelize';
import { EMOTIONS, emotionAttribute } from '../../constants/domain.js';
import { Book } from '../../models/index.js';
import HttpError from '../../utils/http-error.js';
import { parseEnum, parseInteger } from '../../utils/validation.js';
import { AiProviderError, completeJson, isAiConfigured } from '../ai/deepinfra.client.js';

const PAGE_SIZE = 400;
/** A batch answer is long (≈ 80 tokens per book): give it more time than a single short request. */
const BATCH_TIMEOUT_MS = 180_000;
const MAX_CONSECUTIVE_FAILURES = 10;
const FATAL_STATUSES = new Set([401, 402, 403, 404]);
/** Answer tokens per book: seven short numbers and their keys. */
const TOKENS_PER_BOOK = 80;

export const EMOTION_SCOPES = Object.freeze(['missing', 'all']);

const RATING_RULES = [
    'You rate the emotional tone of book descriptions for a book recommendation engine.',
    'Descriptions are usually in Romanian. Rate what a reader would feel from the book described,',
    'not the tone of the marketing text. For each emotion give its intensity from 0 (absent) to 1 (dominant):',
    'anger, disgust, fear, joy, sadness, surprise, neutral.',
    'The emotions are independent: several can be high, they do not need to add up to 1.',
    'Use "neutral" for factual or practical books (textbooks, cookbooks, guides) and few strong feelings.',
    'Use the whole scale: reserve values above 0.8 for emotions that clearly dominate.',
].join(' ');

const SINGLE_PROMPT = `${RATING_RULES} Answer only with a JSON object with exactly these seven keys and numeric values.`;

const BATCH_PROMPT = `${RATING_RULES} You receive several books, each introduced by a key such as [b1].
Answer only with a JSON object that maps every key to an object with exactly the seven emotion keys and numeric values,
for example {"b1": {"anger": 0.1, "disgust": 0, "fear": 0.4, "joy": 0.2, "sadness": 0.6, "surprise": 0.3, "neutral": 0.1}}.`;

/** Turns the model's answer into the 7 column values; rejects answers missing an emotion. */
export const parseEmotionScores = (value) => {
    const scores = {};
    for (const emotion of EMOTIONS) {
        const number = Number(value?.[emotion]);
        if (!Number.isFinite(number)) throw new AiProviderError(`Missing score for "${emotion}"`);
        scores[emotionAttribute(emotion)] = Math.round(Math.min(1, Math.max(0, number)) * 1000) / 1000;
    }
    return scores;
};

const bookText = (book, maxChars) => `Title: ${book.title}\n${book.description.slice(0, maxChars)}`;

/** The user message for a batch: every book under its key ([b1], [b2], …). */
export const buildBatchMessage = (books, maxChars) => books
    .map((book, index) => `[b${index + 1}]\n${bookText(book, maxChars)}`)
    .join('\n\n');

/**
 * Scores of a batch answer, by book id. Books whose entry is missing or incomplete are left out
 * (the caller retries them alone). Pure function.
 * @returns {Map<number, object>}
 */
export const parseBatchScores = (value, books) => {
    const scores = new Map();
    books.forEach((book, index) => {
        try {
            scores.set(book.id, parseEmotionScores(value?.[`b${index + 1}`]));
        } catch {
            // left out: retried on its own
        }
    });
    return scores;
};

export default {
    /** `concurrency` and `batchSize` override the admin settings for this run only. */
    parseParams(raw) {
        const optionalInteger = (value, field, range) => (value === undefined || value === null || value === ''
            ? null
            : parseInteger(value, field, range));
        return {
            scope: raw.scope === undefined ? 'missing' : parseEnum(raw.scope, 'scope', EMOTION_SCOPES),
            limit: optionalInteger(raw.limit, 'limit', { min: 1, max: 1_000_000 }),
            concurrency: optionalInteger(raw.concurrency, 'concurrency', { min: 1, max: 32 }),
            batchSize: optionalInteger(raw.batchSize, 'batchSize', { min: 1, max: 25 }),
        };
    },

    preflight() {
        if (!isAiConfigured()) throw HttpError.serviceUnavailable('Set DEEPINFRA_API_KEY to analyse emotions');
    },

    async run({ scope, limit, ...overrides }, { signal, settings, setTotal, advance, note }) {
        const model = settings['emotions.model'];
        const maxChars = settings['emotions.maxChars'];
        const concurrency = overrides.concurrency ?? settings['emotions.concurrency'];
        const batchSize = overrides.batchSize ?? settings['emotions.batchSize'];
        const where = {
            [Op.and]: [
                Sequelize.where(Sequelize.fn('CHAR_LENGTH', Sequelize.col('description')), {
                    [Op.gte]: settings['emotions.minDescriptionLength'],
                }),
                ...(scope === 'missing' ? [{ [emotionAttribute('joy')]: null }] : []),
            ],
        };

        const eligible = await Book.count({ where });
        setTotal(limit === null ? eligible : Math.min(limit, eligible));
        const stats = { scored: 0, failed: 0, retriedAlone: 0, requests: 0, tokens: 0, model, batchSize, concurrency };
        let consecutiveFailures = 0;
        let lastId = 0;

        const save = async (bookId, scores) => {
            await Book.update(scores, { where: { id: bookId } });
            stats.scored += 1;
            advance({ processed: 1 });
        };

        const fail = (book, error) => {
            if (signal.aborted) throw error;
            if (error instanceof AiProviderError && FATAL_STATUSES.has(error.status)) throw error;
            consecutiveFailures += 1;
            stats.failed += 1;
            advance({ processed: 1, failed: 1 });
            note(`Book ${book.id}: ${error.message}`);
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                throw new Error(`Stopped after ${MAX_CONSECUTIVE_FAILURES} failures in a row: ${error.message}`);
            }
        };

        const scoreAlone = async (book) => {
            try {
                stats.requests += 1;
                const { value, tokens } = await completeJson([
                    { role: 'system', content: SINGLE_PROMPT },
                    { role: 'user', content: bookText(book, maxChars) },
                ], { model, signal, maxTokens: TOKENS_PER_BOOK + 40 });
                stats.tokens += tokens;
                await save(book.id, parseEmotionScores(value));
                consecutiveFailures = 0;
            } catch (error) {
                fail(book, error);
            }
        };

        const scoreBatch = async (books) => {
            if (books.length === 1) {
                await scoreAlone(books[0]);
                return;
            }
            let scores;
            try {
                stats.requests += 1;
                const { value, tokens } = await completeJson([
                    { role: 'system', content: BATCH_PROMPT },
                    { role: 'user', content: buildBatchMessage(books, maxChars) },
                ], { model, signal, maxTokens: TOKENS_PER_BOOK * books.length + 60, timeoutMs: BATCH_TIMEOUT_MS });
                stats.tokens += tokens;
                scores = parseBatchScores(value, books);
            } catch (error) {
                if (signal.aborted) throw error;
                if (error instanceof AiProviderError && FATAL_STATUSES.has(error.status)) throw error;
                scores = new Map(); // the whole answer was unusable: every book is retried alone
            }
            for (const book of books) {
                if (scores.has(book.id)) await save(book.id, scores.get(book.id));
            }
            if (scores.size > 0) consecutiveFailures = 0;
            for (const book of books.filter((candidate) => !scores.has(candidate.id))) {
                if (signal.aborted) return;
                stats.retriedAlone += 1;
                await scoreAlone(book);
            }
        };

        // A continuous pipeline: workers take batches from a queue that is refilled in the
        // background, so a slow request never holds up the others (no waiting at page ends).
        const queue = [];
        let fetched = 0;
        let exhausted = false;
        let refilling = null;
        let refillError = null;
        const refill = async () => {
            const room = limit === null ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - fetched);
            if (room <= 0) {
                exhausted = true;
                return;
            }
            const books = await Book.findAll({
                attributes: ['id', 'title', 'description'],
                where: { ...where, id: { [Op.gt]: lastId } },
                order: [['id', 'ASC']],
                limit: room,
                raw: true,
            });
            if (books.length === 0) {
                exhausted = true;
                return;
            }
            lastId = books[books.length - 1].id;
            fetched += books.length;
            for (let i = 0; i < books.length; i += batchSize) queue.push(books.slice(i, i + batchSize));
        };
        const ensureFilled = () => {
            if (!refilling && !exhausted && queue.length < concurrency * 2) {
                refilling = refill()
                    .catch((error) => {
                        refillError = error; // reported by the next worker that asks for a batch
                        exhausted = true;
                    })
                    .finally(() => { refilling = null; });
            }
            return refilling;
        };
        const nextBatch = async () => {
            while (queue.length === 0 && !exhausted && !signal.aborted) await ensureFilled();
            if (refillError) throw refillError;
            ensureFilled(); // prefetch while this batch is being scored
            return queue.shift();
        };

        try {
            await Promise.all(Array.from({ length: concurrency }, async () => {
                for (;;) {
                    if (signal.aborted) return;
                    const batch = await nextBatch();
                    if (!batch) return;
                    await scoreBatch(batch);
                    note(`${stats.scored} scored, ${stats.failed} failed, ${stats.requests} requests`);
                }
            }));
            await refilling;
        } catch (error) {
            error.partialResult = stats;
            throw error;
        }
        return stats;
    },
};
