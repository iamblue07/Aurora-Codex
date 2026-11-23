import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    createTopList, dot, fromBuffer, normalize, quantize, quantizedDot, shorten, toBuffer, weightedCentroid,
} from '../../src/services/ai/vector-math.js';

const close = (actual, expected, tolerance = 1e-6) => assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
);

const randomUnitVector = (length, seed) => {
    let state = seed;
    const next = () => { state = (state * 1103515245 + 12345) % 2 ** 31; return state / 2 ** 31 - 0.5; };
    return normalize(Array.from({ length }, next));
};

describe('vector math', () => {
    it('normalises to unit length and leaves zero vectors at zero', () => {
        close(dot(normalize([3, 4]), normalize([3, 4])), 1);
        assert.deepEqual([...normalize([3, 4])].map((v) => Math.round(v * 10) / 10), [0.6, 0.8]);
        assert.deepEqual([...normalize([0, 0])], [0, 0]);
    });

    it('shortens Matryoshka vectors to the first N values and re-normalises', () => {
        const short = shorten([3, 4, 12], 2);
        assert.equal(short.length, 2);
        close(dot(short, short), 1);
        assert.equal(shorten([1, 2], 10).length, 2);
    });

    it('round-trips vectors through the float32 storage format', () => {
        const vector = Float32Array.from([0.5, -0.25, 0.125]);
        const buffer = toBuffer(vector);
        assert.equal(buffer.length, 12);
        assert.deepEqual([...fromBuffer(buffer)], [...vector]);
    });

    it('averages liked books into a unit taste vector, ignoring zero weights', () => {
        const taste = weightedCentroid([
            { vector: Float32Array.from([1, 0]), weight: 3 },
            { vector: Float32Array.from([0, 1]), weight: 1 },
            { vector: Float32Array.from([-1, 0]), weight: 0 },
        ]);
        close(dot(taste, taste), 1);
        assert.ok(taste[0] > taste[1]);
        assert.equal(weightedCentroid([]), null);
    });

    it('keeps cosine similarity accurate after int8 quantisation', () => {
        const dimensions = 1024;
        const query = randomUnitVector(dimensions, 1);
        for (let seed = 2; seed < 12; seed += 1) {
            const row = randomUnitVector(dimensions, seed);
            const { values, scale } = quantize(row);
            close(quantizedDot(query, values, 0, scale), dot(query, row), 0.01);
        }
    });

    it('keeps the best N items, best first', () => {
        const top = createTopList(3);
        [[1, 0.2], [2, 0.9], [3, 0.5], [4, 0.1], [5, 0.7]].forEach(([id, score]) => top.offer(id, score));
        assert.deepEqual(top.toArray().map(({ item }) => item), [2, 5, 3]);
        const none = createTopList(0);
        none.offer(1, 1);
        assert.deepEqual(none.toArray(), []);
    });
});

describe('search worker pool', () => {
    it('returns the same results as a main-thread scan, from shared memory', async () => {
        const { createSearchPool } = await import('../../src/services/ai/search-pool.js');
        const { scanTopK } = await import('../../src/services/ai/vector-math.js');
        const dimensions = 64;
        const count = 200;
        const index = {
            dimensions,
            count,
            ids: new Int32Array(new SharedArrayBuffer(count * 4)),
            matrix: new Int8Array(new SharedArrayBuffer(count * dimensions)),
            scales: new Float32Array(new SharedArrayBuffer(count * 4)),
        };
        for (let row = 0; row < count; row += 1) {
            const { values, scale } = quantize(randomUnitVector(dimensions, row + 100));
            index.ids[row] = row + 1;
            index.matrix.set(values, row * dimensions);
            index.scales[row] = scale;
        }
        const query = randomUnitVector(dimensions, 7);
        const exclude = new Set([3, 4]);

        const pool = createSearchPool(index, 2);
        try {
            const [first, second] = await Promise.all([
                pool.search(query, { limit: 5, exclude }),
                pool.search(query, { limit: 5, exclude }),
            ]);
            const expected = scanTopK(index, query, { limit: 5, exclude });
            assert.deepEqual(first, expected);
            assert.deepEqual(second, expected);
        } finally {
            pool.terminate();
        }
    });
});
