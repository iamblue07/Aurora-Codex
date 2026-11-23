import { userIdFromAuthorization } from '../services/token.service.js';
import HttpError from '../utils/http-error.js';

/**
 * Requires a valid JWT in the `Authorization: Bearer <token>` header.
 * On success `req.user` holds `{ id }` of the authenticated user.
 */
const authenticate = (req, _res, next) => {
    if (!req.headers.authorization) return next(HttpError.unauthorized());
    try {
        req.user = { id: userIdFromAuthorization(req.headers.authorization) };
        return next();
    } catch {
        return next(HttpError.unauthorized('Invalid or expired token'));
    }
};

export default authenticate;
