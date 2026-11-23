/** Reads a JWT payload without verifying it (verification is the server's job). */
export const decodeJwt = (token) => {
    try {
        const [, payload] = token.split('.');
        // base64url -> bytes -> UTF-8 text: atob alone would garble non-ASCII claims (ă, ș, ț…).
        const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
};

/** True when the token is malformed or its `exp` claim is in the past. */
export const isTokenExpired = (token, now = Date.now()) => {
    const exp = decodeJwt(token)?.exp;
    return typeof exp !== 'number' || exp * 1000 <= now;
};

/** Milliseconds until the token expires (0 if already expired). */
export const msUntilExpiry = (token, now = Date.now()) => {
    const exp = decodeJwt(token)?.exp;
    return typeof exp === 'number' ? Math.max(0, exp * 1000 - now) : 0;
};
