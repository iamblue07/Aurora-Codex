import { isSessionValid } from '../services/session.service.js';
import { claimsFromAuthorization } from '../services/token.service.js';
import HttpError from '../utils/http-error.js';

/**
 * Requires a valid JWT in the `Authorization: Bearer <token>` header, issued for an account that
 * still exists and whose sessions were not revoked since. On success `req.user` is `{ id }`.
 */
const authenticate = async (req, _res, next) => {
    if (!req.headers.authorization) return next(HttpError.unauthorized());
    let claims;
    try {
        claims = claimsFromAuthorization(req.headers.authorization);
    } catch {
        return next(HttpError.unauthorized('Invalid or expired token'));
    }
    try {
        if (!await isSessionValid(claims)) return next(HttpError.unauthorized('Session has been revoked'));
    } catch (error) {
        return next(error);
    }
    req.user = { id: claims.id };
    return next();
};

export default authenticate;
