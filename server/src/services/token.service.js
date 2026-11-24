import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const ALGORITHM = 'HS256';

/** Tokens carry the user id and their session version (`v`, see session.service.js). */
export const signToken = (user) => jwt.sign(
    { id: user.id, v: user.tokenVersion ?? 0 },
    config.auth.secret,
    { algorithm: ALGORITHM, expiresIn: config.auth.tokenTtl },
);

export const verifyToken = (token) => jwt.verify(token, config.auth.secret, { algorithms: [ALGORITHM] });

/** Extracts the token from an `Authorization: Bearer <token>` header value, or returns null. */
export const extractBearerToken = (header) => {
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

/**
 * The user id and session version carried by a header value. Throws if the token is missing,
 * invalid, expired or doesn't carry a valid id. Tokens issued before versions existed count as 0.
 * @returns {{ id: number, version: number }}
 */
export const claimsFromAuthorization = (header) => {
    const token = extractBearerToken(header);
    if (!token) throw new Error('missing bearer token');
    const payload = verifyToken(token);
    const id = Number(payload.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('token carries no valid user id');
    const version = payload.v === undefined ? 0 : Number(payload.v);
    if (!Number.isSafeInteger(version) || version < 0) throw new Error('token carries no valid version');
    return { id, version };
};
