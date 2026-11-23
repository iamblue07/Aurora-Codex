import { describe, expect, it } from 'vitest';
import { decodeJwt, isTokenExpired, msUntilExpiry } from './jwt';

/** Builds an unsigned JWT-shaped string with a base64url payload (UTF-8 safe). */
const makeToken = (payload) => {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const base64 = btoa(String.fromCharCode(...bytes));
    return `header.${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.signature`;
};

const NOW = 1_800_000_000_000;

describe('decodeJwt', () => {
    it('reads the payload', () => {
        expect(decodeJwt(makeToken({ id: 9, exp: 123 }))).toEqual({ id: 9, exp: 123 });
    });

    it('decodes non-ASCII claims as UTF-8', () => {
        expect(decodeJwt(makeToken({ username: 'Ană Ștefănescu' })).username).toBe('Ană Ștefănescu');
    });

    it('returns null for malformed tokens', () => {
        expect(decodeJwt('not-a-token')).toBeNull();
        expect(decodeJwt('a.%%%.c')).toBeNull();
        expect(decodeJwt(undefined)).toBeNull();
    });
});

describe('token expiry', () => {
    it('is valid until the exp claim', () => {
        const token = makeToken({ exp: NOW / 1000 + 60 });
        expect(isTokenExpired(token, NOW)).toBe(false);
        expect(msUntilExpiry(token, NOW)).toBe(60_000);
    });

    it('is expired after the exp claim', () => {
        const token = makeToken({ exp: NOW / 1000 - 1 });
        expect(isTokenExpired(token, NOW)).toBe(true);
        expect(msUntilExpiry(token, NOW)).toBe(0);
    });

    it('treats tokens without exp, or malformed ones, as expired', () => {
        expect(isTokenExpired(makeToken({ id: 1 }), NOW)).toBe(true);
        expect(isTokenExpired('garbage', NOW)).toBe(true);
    });
});
