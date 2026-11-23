import '../helpers/env.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { buildReadingProfile, RECOMMENDATION_SETTINGS } = await import('../../src/services/recommendation.service.js');

const book = (genre, emotions = {}) => ({
    genre,
    ...Object.fromEntries(Object.entries(emotions).map(([emotion, score]) => [`${emotion}Score`, score])),
});

describe('buildReadingProfile', () => {
    it('falls back to a generic query and no emotional preference for a brand new user', () => {
        const profile = buildReadingProfile([], []);
        assert.equal(profile.query, RECOMMENDATION_SETTINGS.queryPrefix);
        assert.equal(profile.sentiment, null);
        assert.deepEqual(profile.topGenres, []);
    });

    it('uses favourite genres even without any reading history', () => {
        const profile = buildReadingProfile(['history', 'fiction'], []);
        assert.deepEqual(profile.topGenres, ['history', 'fiction']);
        // The recommender searches Romanian descriptions, so the query uses the Romanian labels.
        assert.equal(profile.query, 'Literatura moderna despre ISTORIE, FICTIUNE');
    });

    it('ranks genres by average rating and boosts favourites', () => {
        const readBooks = [
            { rating: 5, book: book('philosophy') },
            { rating: 4, book: book('fiction') },
            { rating: 4, book: book('fiction') },
            { rating: 1, book: book('law') },
            { rating: 2, book: book('history') },
        ];
        // fiction 4 * 1.2 = 4.8, philosophy 5, law 1, history 2
        assert.deepEqual(buildReadingProfile(['fiction'], readBooks).topGenres, ['philosophy', 'fiction', 'history']);
        // A favourite with a poor rating still gets the boost: law 1 * 1.2 = 1.2 < history 2.
        assert.deepEqual(buildReadingProfile(['law'], readBooks).topGenres, ['philosophy', 'fiction', 'history']);
    });

    it('ignores books without a genre when picking top genres', () => {
        const profile = buildReadingProfile([], [{ rating: 5, book: book(null) }, { rating: 3, book: book('law') }]);
        assert.deepEqual(profile.topGenres, ['law']);
    });

    it('derives the dominant emotion from highly rated books only', () => {
        const readBooks = [
            { rating: 5, book: book('fiction', { joy: 0.9, sadness: 0.1 }) },
            { rating: 4, book: book('fiction', { joy: 0.6, sadness: 0.3 }) },
            { rating: 1, book: book('fiction', { sadness: 5 }) }, // low rating: ignored
        ];
        assert.equal(buildReadingProfile([], readBooks).sentiment, 'joy');
    });

    it('does not double count duplicated favourites', () => {
        const once = buildReadingProfile(['law'], [{ rating: 4, book: book('fiction') }]);
        const twice = buildReadingProfile(['law', 'law'], [{ rating: 4, book: book('fiction') }]);
        assert.deepEqual(once, twice);
    });
});
