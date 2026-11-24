import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import '../helpers/env.js';
import { closestSeed, dequantizeRow, diversify, normalize, quantize } from '../../src/services/ai/vector-math.js';

const { dislikePenalty } = await import('../../src/services/recommendation.service.js');

const unit = (...values) => normalize(Float32Array.from(values));

describe('diversify', () => {
    const vectors = new Map([
        [1, unit(1, 0)],
        [2, unit(0.99, 0.01)], // near-duplicate of 1
        [3, unit(0, 1)],
    ]);
    const ranked = [{ id: 1, score: 1 }, { id: 2, score: 0.95 }, { id: 3, score: 0.8 }];

    it('keeps the relevance order without diversity', () => {
        assert.deepEqual(diversify(ranked, vectors, { limit: 3 }).map((item) => item.id), [1, 2, 3]);
    });

    it('prefers a different book over a near-duplicate', () => {
        assert.deepEqual(diversify(ranked, vectors, { limit: 2, diversity: 0.5 }).map((item) => item.id), [1, 3]);
    });

    it('caps items per group', () => {
        const grouped = ranked.map((item) => ({ ...item, group: item.id < 3 ? 'herbert' : 'asimov' }));
        assert.deepEqual(diversify(grouped, vectors, { limit: 3, perGroup: 1 }).map((item) => item.id), [1, 3]);
    });

    it('treats items without a vector as unique and respects the limit', () => {
        const picked = diversify([{ id: 9, score: 1 }, ...ranked], vectors, { limit: 2, diversity: 0.9 });
        assert.equal(picked.length, 2);
        assert.equal(picked[0].id, 9);
    });
});

describe('closestSeed', () => {
    it('returns the most similar seed', () => {
        const seeds = [{ id: 10, vector: unit(1, 0) }, { id: 20, vector: unit(0, 1) }];
        assert.equal(closestSeed(unit(0.2, 0.9), seeds).id, 20);
        assert.equal(closestSeed(unit(1, 0), []), null);
    });
});

describe('dislikePenalty', () => {
    it('penalises only books closer to a disliked one than to what they matched', () => {
        const disliked = [unit(1, 0)];
        assert.equal(dislikePenalty(unit(0, 1), 0.8, disliked, 0.5), 0);
        assert.ok(Math.abs(dislikePenalty(unit(1, 0), 0.6, disliked, 0.5) - 0.2) < 1e-6);
        assert.equal(dislikePenalty(unit(1, 0), 0.6, [], 0.5), 0);
        assert.equal(dislikePenalty(null, 0.6, disliked, 0.5), 0);
    });
});

describe('dequantizeRow', () => {
    it('recovers a unit vector close to the original', () => {
        const original = unit(0.3, -0.5, 0.8, 0.1);
        const { values, scale } = quantize(original);
        const restored = dequantizeRow({ matrix: values, scales: Float32Array.of(scale), dimensions: 4 }, 0);
        original.forEach((value, i) => assert.ok(Math.abs(value - restored[i]) < 0.01));
    });
});
