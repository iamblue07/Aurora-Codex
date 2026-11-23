/**
 * Generates the semantic vectors of the catalogue (DeepInfra embeddings -> book_embeddings).
 *
 * The catalogue is scanned in pages; a book is (re-)embedded when it has no vector yet, when its
 * text changed (content hash) or when the model/dimensions setting changed. `scope: "all"`
 * re-embeds everything. Vectors are written as they arrive, so a cancelled or failed run keeps
 * its progress and the next run continues where it stopped.
 */
import { Op } from 'sequelize';
import { Book, BookEmbedding } from '../../models/index.js';
import HttpError from '../../utils/http-error.js';
import { parseEnum, parseInteger } from '../../utils/validation.js';
import { buildBookText, contentHash } from '../ai/book-text.js';
import { AiProviderError, embed, isAiConfigured } from '../ai/deepinfra.client.js';
import { clearFeaturesCache, warmUpSearchIndex } from '../ai/ai-status.service.js';
import { invalidateIndex } from '../ai/vector-index.js';
import { shorten, toBuffer } from '../ai/vector-math.js';

const SCAN_PAGE_SIZE = 500;
/** Consecutive failed batches after which the run gives up (e.g. provider outage). */
const MAX_CONSECUTIVE_FAILURES = 5;
/** Provider statuses that no retry can fix: wrong key, no access, unknown model. */
const FATAL_STATUSES = new Set([401, 402, 403, 404]);

export const EMBEDDING_SCOPES = Object.freeze(['missing', 'all']);

const chunk = (items, size) => Array.from(
    { length: Math.ceil(items.length / size) },
    (_, i) => items.slice(i * size, (i + 1) * size),
);

export default {
    parseParams(raw) {
        return {
            scope: raw.scope === undefined ? 'missing' : parseEnum(raw.scope, 'scope', EMBEDDING_SCOPES),
            /** Stop after embedding this many books (handy for a cheap trial run). */
            limit: raw.limit === undefined || raw.limit === null || raw.limit === ''
                ? null
                : parseInteger(raw.limit, 'limit', { min: 1, max: 1_000_000 }),
        };
    },

    preflight() {
        if (!isAiConfigured()) throw HttpError.serviceUnavailable('Set DEEPINFRA_API_KEY to generate embeddings');
    },

    async run({ scope, limit }, { signal, settings, setTotal, advance, note }) {
        const model = settings['embeddings.model'];
        const dimensions = settings['embeddings.dimensions'];
        const maxChars = settings['embeddings.maxChars'];
        const batchSize = settings['embeddings.batchSize'];
        const concurrency = settings['embeddings.concurrency'];

        setTotal(await Book.count());
        const stats = { embedded: 0, skipped: 0, failed: 0, tokens: 0, model, dimensions };
        let consecutiveFailures = 0;
        let lastId = 0;

        const embedBatch = async (batch) => {
            try {
                const { vectors, tokens } = await embed(batch.map((item) => item.text), { model, signal });
                await BookEmbedding.bulkCreate(batch.map((item, i) => ({
                    bookId: item.bookId,
                    model,
                    dimensions,
                    contentHash: item.hash,
                    embedding: toBuffer(shorten(vectors[i], dimensions)),
                })), { updateOnDuplicate: ['model', 'dimensions', 'contentHash', 'embedding', 'updatedAt'] });
                stats.embedded += batch.length;
                stats.tokens += tokens;
                consecutiveFailures = 0;
                advance({ processed: batch.length });
            } catch (error) {
                if (signal.aborted) throw error;
                if (error instanceof AiProviderError && FATAL_STATUSES.has(error.status)) throw error;
                consecutiveFailures += 1;
                stats.failed += batch.length;
                advance({ processed: batch.length, failed: batch.length });
                note(`Batch failed: ${error.message}`);
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    throw new Error(`Stopped after ${MAX_CONSECUTIVE_FAILURES} failed batches in a row: ${error.message}`);
                }
            }
        };

        try {
            while (!signal.aborted) {
                const books = await Book.findAll({
                    attributes: ['id', 'title', 'author', 'genre', 'description'],
                    where: { id: { [Op.gt]: lastId } },
                    order: [['id', 'ASC']],
                    limit: SCAN_PAGE_SIZE,
                    raw: true,
                });
                if (books.length === 0) break;
                lastId = books[books.length - 1].id;

                const existing = scope === 'all' ? new Map() : new Map((await BookEmbedding.findAll({
                    attributes: ['bookId', 'model', 'dimensions', 'contentHash'],
                    where: { bookId: books.map((book) => book.id) },
                    raw: true,
                })).map((row) => [row.bookId, row]));

                let pending = [];
                for (const book of books) {
                    const text = buildBookText(book, maxChars);
                    const hash = contentHash(text);
                    const current = existing.get(book.id);
                    const isCurrent = current?.model === model && current.dimensions === dimensions
                        && current.contentHash === hash;
                    if (isCurrent) {
                        stats.skipped += 1;
                        continue;
                    }
                    pending.push({ bookId: book.id, text, hash });
                }
                advance({ processed: books.length - pending.length });

                if (limit !== null) pending = pending.slice(0, Math.max(0, limit - stats.embedded - stats.failed));

                // `concurrency` workers share the page's batches.
                const queue = chunk(pending, batchSize);
                await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
                    while (queue.length && !signal.aborted) await embedBatch(queue.shift());
                }));

                note(`${stats.embedded} embedded, ${stats.skipped} unchanged, ${stats.failed} failed`);
                if (limit !== null && stats.embedded + stats.failed >= limit) break;
            }
        } catch (error) {
            error.partialResult = stats;
            throw error;
        } finally {
            // New vectors only become searchable once the index is rebuilt.
            if (stats.embedded > 0) {
                invalidateIndex();
                clearFeaturesCache();
                warmUpSearchIndex(); // rebuild in the background with the new vectors
            }
        }
        return stats;
    },
};
