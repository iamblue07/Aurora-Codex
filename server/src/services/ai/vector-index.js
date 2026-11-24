/**
 * In-memory nearest-neighbour index over the book embeddings stored in MySQL.
 *
 * MySQL 8 cannot compare vectors (and MySQL 9 Community has no DISTANCE()), so the vectors are
 * loaded once into a compact int8 matrix and searched by brute force: ~50k books x 1024
 * dimensions is ~50 MB and a search takes about a tenth of a second. Nothing is re-embedded on restart:
 * the vectors are persisted in MySQL and only re-read into memory, in the background at startup
 * (see `warmUpSearchIndex`), and again after embeddings change (see `invalidateIndex`).
 */
import { Op } from 'sequelize';
import { BookEmbedding } from '../../models/index.js';
import logger from '../../utils/logger.js';
import { createSearchPool } from './search-pool.js';
import { dequantizeRow, fromBuffer, quantize, scanTopK } from './vector-math.js';

const LOAD_PAGE_SIZE = 2000;

let index = null;
let loading = null;

const buildIndex = async ({ model, dimensions }) => {
    const startedAt = Date.now();
    const total = await BookEmbedding.count({ where: { model, dimensions } });
    // SharedArrayBuffers: the search workers read this memory directly, without copies.
    const ids = new Int32Array(new SharedArrayBuffer(Math.max(1, total) * 4));
    const matrix = new Int8Array(new SharedArrayBuffer(Math.max(1, total * dimensions)));
    const scales = new Float32Array(new SharedArrayBuffer(Math.max(1, total) * 4));

    let count = 0;
    let lastId = 0;
    while (count < total) {
        const rows = await BookEmbedding.findAll({
            attributes: ['bookId', 'embedding'],
            where: { model, dimensions, bookId: { [Op.gt]: lastId } },
            order: [['bookId', 'ASC']],
            limit: LOAD_PAGE_SIZE,
            raw: true,
        });
        if (rows.length === 0) break;
        for (const row of rows) {
            if (count >= total) break; // rows added while loading are picked up next rebuild
            ids[count] = row.bookId;
            const { values, scale } = quantize(fromBuffer(row.embedding));
            matrix.set(values, count * dimensions);
            scales[count] = scale;
            count += 1;
        }
        lastId = rows[rows.length - 1].bookId;
    }

    logger.info(`[vector-index] loaded ${count} vectors (${model}, ${dimensions}d) in ${Date.now() - startedAt} ms`);
    const built = {
        model,
        dimensions,
        count,
        ids: ids.subarray(0, count),
        matrix: matrix.subarray(0, count * dimensions),
        scales: scales.subarray(0, count),
        loadedAt: new Date().toISOString(),
    };
    try {
        built.pool = createSearchPool(built);
    } catch (error) {
        logger.warn(`[vector-index] no search workers, searching on the main thread: ${error.message}`);
    }
    return built;
};

/** Returns the index for the given embedding space, building it if needed. */
const getIndex = async (space) => {
    if (index && index.model === space.model && index.dimensions === space.dimensions) return index;
    if (!loading) {
        loading = buildIndex(space)
            .then((built) => {
                index?.pool?.terminate(); // the previous space's workers
                index = built;
                return built;
            })
            .finally(() => { loading = null; });
    }
    const built = await loading;
    // Another space may have been requested while loading; retry for ours.
    const matches = built.model === space.model && built.dimensions === space.dimensions;
    return matches ? built : getIndex(space);
};

/** Builds the index ahead of the first search (used at startup). */
export const loadIndex = (space) => getIndex(space);

/** Drops the index; the next search rebuilds it (call after embeddings are written). */
export const invalidateIndex = () => {
    index?.pool?.terminate();
    index = null;
};

/**
 * The `limit` books most similar to `queryVector` (a unit vector in the same space).
 * @param {{ model: string, dimensions: number }} space
 * @param {Float32Array} queryVector
 * @param {{ limit: number, exclude?: Set<number> }} options
 * @returns {Promise<{ bookId: number, similarity: number }[]>} most similar first
 */
export const searchSimilar = async (space, queryVector, { limit, exclude = new Set() }) => {
    const current = await getIndex(space);
    if (queryVector.length !== current.dimensions) {
        throw new Error(`Query vector has ${queryVector.length} dimensions, the index ${current.dimensions}`);
    }
    if (current.pool) {
        try {
            return await current.pool.search(queryVector, { limit, exclude });
        } catch (error) {
            logger.warn(`[vector-index] worker search failed, using the main thread: ${error.message}`);
        }
    }
    return scanTopK(current, queryVector, { limit, exclude });
};

/**
 * Stored vectors of the given books (approximate: read back from the int8 index), as unit vectors.
 * Books without an embedding in this space are missing from the result.
 * @returns {Promise<Map<number, Float32Array>>}
 */
export const getVectors = async (space, bookIds) => {
    const current = await getIndex(space);
    if (!current.rowById) {
        current.rowById = new Map();
        for (let row = 0; row < current.count; row += 1) current.rowById.set(current.ids[row], row);
    }
    const vectors = new Map();
    for (const bookId of bookIds) {
        const row = current.rowById.get(bookId);
        if (row !== undefined) vectors.set(bookId, dequantizeRow(current, row));
    }
    return vectors;
};

/** Size and freshness of the loaded index, for the admin panel. */
export const getIndexStats = () => {
    if (!index) return { loaded: false, loading: Boolean(loading) };
    const bytes = index.matrix.byteLength + index.ids.byteLength + index.scales.byteLength;
    return {
        loaded: true,
        model: index.model,
        dimensions: index.dimensions,
        vectors: index.count,
        memoryMb: Math.round((bytes / (1024 * 1024)) * 10) / 10,
        loadedAt: index.loadedAt,
    };
};
