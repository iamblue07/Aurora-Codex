import jwt from 'jsonwebtoken';
import config from '../config/env.js';

// HS256 is what the Python recommender service expects when it validates the same tokens.
const ALGORITHM = 'HS256';

export const signToken = (user) =>
    jwt.sign({ id: user.id }, config.auth.secret, { algorithm: ALGORITHM, expiresIn: config.auth.tokenTtl });

export const verifyToken = (token) => jwt.verify(token, config.auth.secret, { algorithms: [ALGORITHM] });

/** Extracts the token from an `Authorization: Bearer <token>` header value, or returns null. */
export const extractBearerToken = (header) => {
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

/**
 * Returns the authenticated user id carried by a header value.
 * Throws if the token is missing, invalid, expired or doesn't carry a valid id.
 */
export const userIdFromAuthorization = (header) => {
    const token = extractBearerToken(header);
    if (!token) throw new Error('missing bearer token');
    const id = Number(verifyToken(token).id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('token carries no valid user id');
    return id;
};
