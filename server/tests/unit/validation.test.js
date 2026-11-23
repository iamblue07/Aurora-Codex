import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import HttpError from '../../src/utils/http-error.js';
import {
    optionalString,
    parseBoolean,
    parseId,
    parseIdList,
    parseList,
    parseNumber,
    parseOptionalEnum,
    parseOptionalId,
    parsePagination,
    requireString,
    toLikePattern,
} from '../../src/utils/validation.js';

const isBadRequest = (error) => error instanceof HttpError && error.status === 400;

describe('parseId', () => {
    it('accepts positive integers given as numbers or strings', () => {
        assert.equal(parseId(5), 5);
        assert.equal(parseId('42'), 42);
    });

    it('rejects zero, negatives, decimals and garbage', () => {
        for (const value of [0, -1, 1.5, 'abc', '', null, undefined, '12abc']) {
            assert.throws(() => parseId(value), isBadRequest, `value ${value}`);
        }
    });

    it('treats blank values as null in parseOptionalId', () => {
        for (const blank of [undefined, null, '', 'null', 'undefined']) assert.equal(parseOptionalId(blank), null);
        assert.equal(parseOptionalId('7'), 7);
    });
});

describe('parseIdList / parseList', () => {
    it('parses comma-separated query values', () => {
        assert.deepEqual(parseList('a, b,,c'), ['a', 'b', 'c']);
        assert.deepEqual(parseList(undefined), []);
        assert.deepEqual(parseIdList(parseList('3,1,2')), [3, 1, 2]);
    });

    it('rejects empty and oversized lists', () => {
        assert.throws(() => parseIdList([]), isBadRequest);
        assert.throws(() => parseIdList(Array.from({ length: 5 }, (_, i) => i + 1), { max: 4 }), isBadRequest);
    });
});

describe('scalar parsers', () => {
    it('parseNumber enforces bounds and rejects blanks', () => {
        assert.equal(parseNumber('25.5', 'price', { min: 0 }), 25.5);
        assert.throws(() => parseNumber('-1', 'price', { min: 0 }), isBadRequest);
        assert.throws(() => parseNumber('', 'price'), isBadRequest);
        assert.throws(() => parseNumber('Infinity', 'price'), isBadRequest);
    });

    it('parseBoolean understands form-data strings', () => {
        assert.equal(parseBoolean('true', 'x'), true);
        assert.equal(parseBoolean('0', 'x'), false);
        assert.throws(() => parseBoolean('yes', 'x'), isBadRequest);
    });

    it('requireString trims and enforces length', () => {
        assert.equal(requireString('  hi  ', 'f'), 'hi');
        assert.throws(() => requireString('   ', 'f'), isBadRequest);
        assert.throws(() => requireString('abcd', 'f', { maxLength: 3 }), isBadRequest);
        assert.equal(optionalString(undefined, 'f'), '');
    });

    it('parseOptionalEnum falls back when missing and rejects unknown values', () => {
        assert.equal(parseOptionalEnum(undefined, 'sort', ['a', 'b'], 'a'), 'a');
        assert.equal(parseOptionalEnum('b', 'sort', ['a', 'b']), 'b');
        assert.throws(() => parseOptionalEnum('c', 'sort', ['a', 'b']), isBadRequest);
    });
});

describe('parsePagination', () => {
    it('defaults and clamps values', () => {
        assert.deepEqual(parsePagination(undefined, undefined), { page: 1, limit: 10, offset: 0 });
        assert.deepEqual(parsePagination('3', '20'), { page: 3, limit: 20, offset: 40 });
        assert.deepEqual(parsePagination('-2', '5000', { maxLimit: 50 }), { page: 1, limit: 50, offset: 0 });
    });
});

describe('toLikePattern', () => {
    it('escapes LIKE wildcards so user input matches literally', () => {
        assert.equal(toLikePattern('50%_off\\'), '%50\\%\\_off\\\\%');
    });
});
