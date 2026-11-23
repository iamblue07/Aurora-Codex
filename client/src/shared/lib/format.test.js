import { describe, expect, it } from 'vitest';
import {
    formatCount, formatDecimal, formatPercent, formatPrice, formatRelativeTime, initials, plural,
} from './format';

// Intl output for ro-RO uses non-breaking spaces; normalise them so expectations stay readable.
const text = (value) => value.replace(/[\u00a0\u202f]/g, ' ');

describe('formatPrice', () => {
    it('drops the decimals of whole prices', () => {
        expect(formatPrice(45)).toBe('45 lei');
    });

    it('always shows two decimals otherwise, with a decimal comma', () => {
        expect(formatPrice(24.9)).toBe('24,90 lei');
        expect(formatPrice('51.1')).toBe('51,10 lei');
    });

    it('groups thousands with a dot', () => {
        expect(formatPrice(1250)).toBe('1.250 lei');
    });

    it('shows a dash for missing values', () => {
        expect(formatPrice(null)).toBe('—');
        expect(formatPrice(undefined)).toBe('—');
        expect(formatPrice('abc')).toBe('—');
    });
});

describe('number helpers', () => {
    it('formats counts with Romanian grouping', () => {
        expect(formatCount(56373)).toBe('56.373');
    });

    it('formats 0–100 percentages with a decimal comma', () => {
        expect(text(formatPercent(25.55))).toBe('25,6 %');
        expect(text(formatPercent(40))).toBe('40 %');
    });

    it('formats fixed decimals', () => {
        expect(formatDecimal(4)).toBe('4,0');
        expect(formatDecimal(3.456, 2)).toBe('3,46');
    });
});

describe('plural', () => {
    it('uses the singular for one', () => {
        expect(plural(1, 'carte', 'cărți')).toBe('1 carte');
    });

    it('omits "de" below 20 and for numbers ending in 01–19', () => {
        expect(plural(5, 'carte', 'cărți')).toBe('5 cărți');
        expect(plural(105, 'carte', 'cărți')).toBe('105 cărți');
    });

    it('inserts "de" from 20 on', () => {
        expect(plural(20, 'carte', 'cărți')).toBe('20 de cărți');
        expect(plural(1200, 'carte', 'cărți')).toBe('1.200 de cărți');
    });
});

describe('initials', () => {
    it('takes the first letters of the first two words', () => {
        expect(initials('Ana Maria')).toBe('AM');
        expect(initials('cititoarea_ana')).toBe('CA');
    });

    it('takes two letters of a single word and falls back to "?"', () => {
        expect(initials('dani07')).toBe('DA');
        expect(initials('   ')).toBe('?');
    });
});

describe('formatRelativeTime', () => {
    const now = new Date('2026-06-15T12:00:00Z').getTime();

    it('says "acum" for the last minute', () => {
        expect(formatRelativeTime(now - 20_000, now)).toBe('acum');
    });

    it('uses the largest fitting unit', () => {
        expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe('acum 3 ore');
        expect(formatRelativeTime(now - 24 * 3600_000, now)).toBe('ieri');
    });

    it('returns an empty string for invalid dates', () => {
        expect(formatRelativeTime('not a date', now)).toBe('');
    });
});
