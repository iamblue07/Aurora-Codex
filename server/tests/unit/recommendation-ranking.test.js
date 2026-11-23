import '../helpers/env.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { rankCandidates, tasteWeight } = await import('../../src/services/recommendation.service.js');
const { buildBookText, buildQueryText, contentHash } = await import('../../src/services/ai/book-text.js');
const { parseEmotionScores } = await import('../../src/services/jobs/emotions.job.js');
const { validateSetting } = await import('../../src/services/settings.service.js');

const books = new Map([
    [1, { genre: 'fiction', joyScore: 0.1 }],
    [2, { genre: 'history', joyScore: 0.9 }],
    [3, { genre: 'fiction', joyScore: null }],
]);
const candidates = [
    { bookId: 1, similarity: 0.80 },
    { bookId: 2, similarity: 0.70 },
    { bookId: 3, similarity: 0.60 },
];
const order = (ranked) => ranked.map((entry) => entry.bookId);

describe('rankCandidates', () => {
    it('ranks by similarity alone without a sentiment', () => {
        assert.deepEqual(order(rankCandidates(candidates, books, { emotionWeight: 0.9 })), [1, 2, 3]);
    });

    it('moves books with the requested emotion up as its weight grows', () => {
        assert.deepEqual(order(rankCandidates(candidates, books, { sentiment: 'joy', emotionWeight: 0.2 })), [1, 2, 3]);
        assert.deepEqual(order(rankCandidates(candidates, books, { sentiment: 'joy', emotionWeight: 0.8 })), [2, 3, 1]);
    });

    it('gives unscored books the pool average instead of zero', () => {
        const ranked = rankCandidates(candidates, books, { sentiment: 'joy', emotionWeight: 1 });
        assert.deepEqual(order(ranked), [2, 3, 1]); // book 3 scores 0.5, between 0.9 and 0.1
    });

    it('adds the genre bonus to preferred genres', () => {
        const ranked = rankCandidates(candidates, books, { preferredGenres: ['history'], genreBoost: 0.6 });
        assert.equal(order(ranked)[0], 2);
    });

    it('handles empty and single-candidate pools', () => {
        assert.deepEqual(rankCandidates([], books), []);
        assert.deepEqual(order(rankCandidates([candidates[0]], books)), [1]);
    });
});

describe('taste weight', () => {
    it('counts only liked books, top ratings most', () => {
        assert.deepEqual([3, 4, 5].map((rating) => tasteWeight(rating, 4)), [0, 1, 2]);
    });
});

describe('book text for embeddings', () => {
    const book = { title: 'Dune', author: 'Frank Herbert', genre: 'fiction', description: 'Prima propoziție. A doua propoziție. A treia.' };

    it('combines title, author, genre label and description', () => {
        const text = buildBookText(book, 1000);
        assert.match(text, /^Titlu: Dune\nAutor: Frank Herbert\nGen: .+\nDescriere: Prima propoziție/);
    });

    it('cuts long descriptions at a sentence boundary, or else between words', () => {
        const sentence = buildBookText(book, 100);
        assert.ok(sentence.length <= 100);
        assert.ok(sentence.endsWith('A doua propoziție.'));

        const words = buildBookText(book, 90);
        assert.ok(words.length <= 90);
        assert.ok(words.endsWith('A doua'));
    });

    it('fingerprints the exact text', () => {
        assert.equal(contentHash('a'), contentHash('a'));
        assert.notEqual(contentHash('a'), contentHash('b'));
    });

    it('prefixes queries with the retrieval instruction when set', () => {
        assert.equal(buildQueryText(' dragoste ', 'Find books'), 'Instruct: Find books\nQuery: dragoste');
        assert.equal(buildQueryText(' dragoste ', ''), 'dragoste');
    });
});

describe('emotion scores from the model', () => {
    it('clamps scores to 0–1 and maps them to columns', () => {
        const scores = parseEmotionScores({
            anger: 0.2, disgust: 0, fear: 1.4, joy: '0.5', sadness: -1, surprise: 0.1234, neutral: 0.3,
        });
        assert.deepEqual(scores, {
            angerScore: 0.2, disgustScore: 0, fearScore: 1, joyScore: 0.5,
            sadnessScore: 0, surpriseScore: 0.123, neutralScore: 0.3,
        });
    });

    it('rejects answers missing an emotion', () => {
        assert.throws(() => parseEmotionScores({ joy: 1 }), /anger/);
    });
});

describe('setting validation', () => {
    it('accepts valid values and converts numeric strings', () => {
        assert.equal(validateSetting('recommendations.resultCount', '12'), 12);
        assert.equal(validateSetting('recommendations.emotionWeight', 0.5), 0.5);
        assert.equal(validateSetting('embeddings.model', '  BAAI/bge-m3 '), 'BAAI/bge-m3');
    });

    it('rejects unknown keys, wrong types and out-of-range values', () => {
        assert.throws(() => validateSetting('nope', 1), /Unknown setting/);
        assert.throws(() => validateSetting('recommendations.resultCount', 2.5), /whole number/);
        assert.throws(() => validateSetting('recommendations.emotionWeight', 2), /between 0 and 1/);
        assert.throws(() => validateSetting('recommendations.excludeRead', 'yes'), /true or false/);
        assert.throws(() => validateSetting('embeddings.model', ' '), /must not be empty/);
    });
});
