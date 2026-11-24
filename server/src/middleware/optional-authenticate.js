import { isSessionValid } from '../services/session.service.js';
import { claimsFromAuthorization } from '../services/token.service.js';

/**
 * Like `authenticate`, but never rejects: sets `req.user` when a valid, unrevoked bearer token is
 * present and treats the request as anonymous otherwise. For public endpoints that personalise.
 */
const optionalAuthenticate = async (req, _res, next) => {
    if (!req.headers.authorization) return next();
    try {
        const claims = claimsFromAuthorization(req.headers.authorization);
        if (await isSessionValid(claims)) req.user = { id: claims.id };
    } catch {
        // Invalid or expired token (or a failed lookup): anonymous request.
    }
    return next();
};

export default optionalAuthenticate;
