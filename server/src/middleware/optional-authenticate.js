import { userIdFromAuthorization } from '../services/token.service.js';

/**
 * Like `authenticate`, but never rejects: sets `req.user` when a valid bearer token is present
 * and treats the request as anonymous otherwise. For public endpoints that personalise responses.
 */
const optionalAuthenticate = (req, _res, next) => {
    try {
        req.user = { id: userIdFromAuthorization(req.headers.authorization) };
    } catch {
        // No token, or an invalid/expired one: anonymous request.
    }
    next();
};

export default optionalAuthenticate;
