import '../helpers/env.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { buildBatchMessage, parseBatchScores } = await import('../../src/services/jobs/emotions.job.js');

const full = { anger: 0.1, disgust: 0, fear: 0.5, joy: 0.2, sadness: 0.7, surprise: 0.3, neutral: 0.1 };

describe('emotion batches', () => {
    it('puts every book under its own key and cuts long descriptions', () => {
        const message = buildBatchMessage([
            { id: 7, title: 'Dune', description: 'Desert planet.' },
            { id: 9, title: 'Baltagul', description: 'x'.repeat(50) },
        ], 10);
        assert.match(message, /^\[b1\]\nTitle: Dune\nDesert pla$/m);
        assert.match(message, /\[b2\]\nTitle: Baltagul\nx{10}$/);
    });

    it('maps keys back to book ids and leaves out unusable answers', () => {
        const books = [{ id: 7 }, { id: 9 }, { id: 11 }];
        const scores = parseBatchScores({ b1: full, b2: { joy: 1 }, b3: { ...full, joy: 1.7 } }, books);
        assert.deepEqual([...scores.keys()], [7, 11]);
        assert.equal(scores.get(7).sadnessScore, 0.7);
        assert.equal(scores.get(11).joyScore, 1); // clamped to 0–1
    });

    it('returns nothing for an answer that is not keyed by book', () => {
        assert.equal(parseBatchScores(full, [{ id: 7 }]).size, 0);
        assert.equal(parseBatchScores(null, [{ id: 7 }]).size, 0);
    });
});
