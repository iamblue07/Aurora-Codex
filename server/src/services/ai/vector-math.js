/**
 * Small vector helpers for the recommender. Pure functions, no I/O.
 *
 * Storage format: a vector is saved as packed little-endian float32 values (4 bytes each),
 * the same layout MySQL 9 uses for its VECTOR type.
 */

/** Scales a vector to unit length (cosine similarity then becomes a plain dot product). */
export const normalize = (vector) => {
    let sumOfSquares = 0;
    for (const value of vector) sumOfSquares += value * value;
    const norm = Math.sqrt(sumOfSquares);
    const result = new Float32Array(vector.length);
    if (norm === 0) return result;
    for (let i = 0; i < vector.length; i += 1) result[i] = vector[i] / norm;
    return result;
};

/**
 * Keeps the first `dimensions` values and re-normalises. Matryoshka-trained models (such as
 * Qwen3-Embedding) front-load the information, so a shortened vector stays meaningful while
 * using a fraction of the storage and memory.
 */
export const shorten = (vector, dimensions) => normalize(
    dimensions && dimensions < vector.length ? vector.slice(0, dimensions) : vector,
);

export const toBuffer = (vector) => {
    const buffer = Buffer.alloc(vector.length * 4);
    for (let i = 0; i < vector.length; i += 1) buffer.writeFloatLE(vector[i], i * 4);
    return buffer;
};

export const fromBuffer = (buffer) => {
    const vector = new Float32Array(buffer.length / 4);
    for (let i = 0; i < vector.length; i += 1) vector[i] = buffer.readFloatLE(i * 4);
    return vector;
};

export const dot = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
    return sum;
};

/**
 * Weighted mean of unit vectors, normalised: the "taste" of a reader from the books they liked.
 * @param {{ vector: Float32Array, weight: number }[]} items
 */
export const weightedCentroid = (items) => {
    const usable = items.filter(({ vector, weight }) => vector && weight > 0);
    if (usable.length === 0) return null;
    const result = new Float32Array(usable[0].vector.length);
    for (const { vector, weight } of usable) {
        for (let i = 0; i < result.length; i += 1) result[i] += vector[i] * weight;
    }
    return normalize(result);
};

/**
 * Keeps the `limit` highest-scoring items seen so far. Insertion into a small sorted array is
 * fast here because, after the first few hundred rows, almost every row is rejected at once.
 */
export const createTopList = (limit) => {
    const items = []; // ascending by score: items[0] is the weakest kept item
    return {
        offer(item, score) {
            if (limit <= 0) return;
            if (items.length === limit) {
                if (score <= items[0].score) return;
                items.shift();
            }
            let position = 0;
            while (position < items.length && items[position].score < score) position += 1;
            items.splice(position, 0, { item, score });
        },
        /** Best first. */
        toArray: () => [...items].reverse(),
    };
};

const INT8_MAX = 127;

/**
 * Quantises a vector to int8 for the in-memory index (4x less memory than float32).
 * Each vector gets its own scale (its largest component maps to ±127): components of a
 * 1024-dimension unit vector are tiny (around ±0.03), so a fixed scale would waste the range.
 * @returns {{ values: Int8Array, scale: number }} component i ≈ values[i] * scale
 */
export const quantize = (vector) => {
    let maxAbs = 0;
    for (const value of vector) maxAbs = Math.max(maxAbs, Math.abs(value));
    const scale = maxAbs > 0 ? maxAbs / INT8_MAX : 1;
    const values = new Int8Array(vector.length);
    for (let i = 0; i < vector.length; i += 1) values[i] = Math.round(vector[i] / scale);
    return { values, scale };
};

/** Dot product of a float query with the int8 row stored at `offset` of `matrix`. */
export const quantizedDot = (query, matrix, offset, scale) => {
    let sum = 0;
    for (let i = 0; i < query.length; i += 1) sum += query[i] * matrix[offset + i];
    return sum * scale;
};

/**
 * Brute-force scan of a quantised index: the `limit` rows most similar to `query`.
 * @param {{ ids: Int32Array, matrix: Int8Array, scales: Float32Array, dimensions: number, count: number }} index
 * @returns {{ bookId: number, similarity: number }[]} most similar first
 */
export const scanTopK = ({ ids, matrix, scales, dimensions, count }, query, { limit, exclude = new Set() }) => {
    const top = createTopList(limit);
    for (let row = 0; row < count; row += 1) {
        const bookId = ids[row];
        if (exclude.has(bookId)) continue;
        top.offer(bookId, quantizedDot(query, matrix, row * dimensions, scales[row]));
    }
    return top.toArray().map(({ item, score }) => ({ bookId: item, similarity: score }));
};

/** Row `row` of a quantised index as a unit float vector. */
export const dequantizeRow = ({ matrix, scales, dimensions }, row) => {
    const vector = new Float32Array(dimensions);
    const offset = row * dimensions;
    for (let i = 0; i < dimensions; i += 1) vector[i] = matrix[offset + i] * scales[row];
    return normalize(vector);
};

/**
 * The seed most similar to `vector`, with that similarity: which liked book "explains" a candidate.
 * @param {Float32Array} vector
 * @param {{ id: number, vector: Float32Array }[]} seeds
 * @returns {{ id: number, similarity: number } | null}
 */
export const closestSeed = (vector, seeds) => {
    let best = null;
    for (const seed of seeds) {
        const similarity = dot(vector, seed.vector);
        if (!best || similarity > best.similarity) best = { id: seed.id, similarity };
    }
    return best;
};

/**
 * Re-orders ranked items for variety (Maximal Marginal Relevance): each pick maximises
 * `(1 - diversity) * score - diversity * (similarity to the closest item already picked)`,
 * and no more than `perGroup` items share a group (e.g. an author). Pure function.
 *
 * @param {{ id: number, score: number, group?: string|null }[]} ranked best first, scores ~0–1
 * @param {Map<number, Float32Array>} vectors unit vectors by id (items without one count as unique)
 * @param {{ limit: number, diversity?: number, perGroup?: number }} options
 */
export const diversify = (ranked, vectors, { limit, diversity = 0, perGroup = Infinity }) => {
    const picked = [];
    const pickedVectors = [];
    const groupCounts = new Map();
    const pool = [...ranked];
    while (picked.length < limit && pool.length > 0) {
        let bestIndex = -1;
        let bestValue = -Infinity;
        for (let i = 0; i < pool.length; i += 1) {
            const item = pool[i];
            if (item.group && (groupCounts.get(item.group) ?? 0) >= perGroup) continue;
            const vector = vectors.get(item.id);
            let redundancy = 0;
            if (vector && diversity > 0) {
                for (const other of pickedVectors) redundancy = Math.max(redundancy, dot(vector, other));
            }
            const value = (1 - diversity) * item.score - diversity * redundancy;
            if (value > bestValue) {
                bestValue = value;
                bestIndex = i;
            }
        }
        if (bestIndex === -1) break; // only over-represented groups remain
        const [item] = pool.splice(bestIndex, 1);
        picked.push(item);
        if (vectors.get(item.id)) pickedVectors.push(vectors.get(item.id));
        if (item.group) groupCounts.set(item.group, (groupCounts.get(item.group) ?? 0) + 1);
    }
    return picked;
};
