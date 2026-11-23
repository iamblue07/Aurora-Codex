/**
 * Scores the emotional tone of book descriptions (anger … neutral, 0–1) with an instruction-tuned
 * language model. Replaces the old pipeline (Google-translate to English, then a local
 * English-only classifier): the model reads the Romanian description directly.
 * By default only books without scores are processed (e.g. books added by the scraper).
 */
import { Op, Sequelize } from 'sequelize';
import { EMOTIONS, emotionAttribute } from '../../constants/domain.js';
import { Book } from '../../models/index.js';
import HttpError from '../../utils/http-error.js';
import { parseEnum, parseInteger } from '../../utils/validation.js';
import { AiProviderError, completeJson, isAiConfigured } from '../ai/deepinfra.client.js';

const PAGE_SIZE = 200;
const MAX_CONSECUTIVE_FAILURES = 10;
const FATAL_STATUSES = new Set([401, 402, 403, 404]);

export const EMOTION_SCOPES = Object.freeze(['missing', 'all']);

const SYSTEM_PROMPT = [
    'You rate the emotional tone of book descriptions for a recommendation engine.',
    'The description may be in Romanian. For each emotion, give the intensity a reader would feel',
    'from 0 (absent) to 1 (dominant): anger, disgust, fear, joy, sadness, surprise, neutral.',
    'Answer only with a JSON object with exactly these seven keys and numeric values.',
].join(' ');

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

export default {
    parseParams(raw) {
        return {
            scope: raw.scope === undefined ? 'missing' : parseEnum(raw.scope, 'scope', EMOTION_SCOPES),
            limit: raw.limit === undefined || raw.limit === null || raw.limit === ''
                ? null
                : parseInteger(raw.limit, 'limit', { min: 1, max: 1_000_000 }),
        };
    },

    preflight() {
        if (!isAiConfigured()) throw HttpError.serviceUnavailable('Set DEEPINFRA_API_KEY to analyse emotions');
    },

    async run({ scope, limit }, { signal, settings, setTotal, advance, note }) {
        const model = settings['emotions.model'];
        const maxChars = settings['emotions.maxChars'];
        const concurrency = settings['emotions.concurrency'];
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
        const stats = { scored: 0, failed: 0, tokens: 0, model };
        let consecutiveFailures = 0;
        let lastId = 0;

        const scoreBook = async (book) => {
            try {
                const { value, tokens } = await completeJson([
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Title: ${book.title}\n\n${book.description.slice(0, maxChars)}` },
                ], { model, signal, maxTokens: 120 });
                await Book.update(parseEmotionScores(value), { where: { id: book.id } });
                stats.scored += 1;
                stats.tokens += tokens;
                consecutiveFailures = 0;
                advance({ processed: 1 });
            } catch (error) {
                if (signal.aborted) throw error;
                if (error instanceof AiProviderError && FATAL_STATUSES.has(error.status)) throw error;
                consecutiveFailures += 1;
                stats.failed += 1;
                advance({ processed: 1, failed: 1 });
                note(`Book ${book.id}: ${error.message}`);
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    throw new Error(`Stopped after ${MAX_CONSECUTIVE_FAILURES} failures in a row: ${error.message}`);
                }
            }
        };

        try {
            while (!signal.aborted && (limit === null || stats.scored + stats.failed < limit)) {
                const remaining = limit === null ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - stats.scored - stats.failed);
                const books = await Book.findAll({
                    attributes: ['id', 'title', 'description'],
                    where: { ...where, id: { [Op.gt]: lastId } },
                    order: [['id', 'ASC']],
                    limit: remaining,
                    raw: true,
                });
                if (books.length === 0) break;
                lastId = books[books.length - 1].id;

                const queue = [...books];
                await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
                    while (queue.length && !signal.aborted) await scoreBook(queue.shift());
                }));
                note(`${stats.scored} scored, ${stats.failed} failed`);
            }
        } catch (error) {
            error.partialResult = stats;
            throw error;
        }
        return stats;
    },
};
