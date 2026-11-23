import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    FALLBACK_GENRE,
    GENRE_CODES,
    GENRES,
    genreCodeFromLabel,
    genreLabel,
    isGenreCode,
    normalizeLabel,
} from '../../src/constants/genres.js';
import mapToGenre from '../../src/services/scraper/genre-mapper.js';

describe('genre constants', () => {
    it('has unique snake_case codes and unique labels', () => {
        assert.equal(new Set(GENRE_CODES).size, GENRES.length);
        assert.equal(new Set(GENRES.map((g) => normalizeLabel(g.label))).size, GENRES.length);
        for (const code of GENRE_CODES) assert.match(code, /^[a-z]+(_[a-z]+)*$/);
        assert.ok(isGenreCode(FALLBACK_GENRE));
    });

    it('maps codes to Romanian labels and back, ignoring case and diacritics', () => {
        assert.equal(genreLabel('fiction'), 'FICTIUNE');
        assert.equal(genreCodeFromLabel('Fictiune'), 'fiction');
        assert.equal(genreCodeFromLabel('pentru copii, adolescenti'), 'children_teens');
        assert.equal(genreCodeFromLabel('PENTRU COPII, ADOLESCENȚI'), 'children_teens');
        assert.equal(genreCodeFromLabel('nonexistent'), null);
    });
});

describe('scraper genre mapper', () => {
    it('maps store sub-categories to their top-level genre code', () => {
        assert.equal(mapToGenre('Poezie'), 'poetry_drama_literary_studies');
        assert.equal(mapToGenre('  fotografie '), 'art_architecture');
    });

    it('resolves sub-categories listed under several genres to the first one', () => {
        assert.equal(mapToGenre('Dictionare'), 'linguistics_dictionaries');
    });

    it('recognises top-level labels and falls back for unknown categories', () => {
        assert.equal(mapToGenre('Carte straina'), 'foreign_language_books');
        assert.equal(mapToGenre('Something new'), FALLBACK_GENRE);
        assert.equal(mapToGenre(null), FALLBACK_GENRE);
    });
});
