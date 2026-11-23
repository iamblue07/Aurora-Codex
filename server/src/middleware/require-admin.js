import { User } from '../models/index.js';
import asyncHandler from '../utils/async-handler.js';
import HttpError from '../utils/http-error.js';

/**
 * Must run after `authenticate`. Rejects the request unless the current user is an administrator.
 * The role is read from the database (not the token) so revocations take effect immediately.
 */
const requireAdmin = asyncHandler(async (req, _res, next) => {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'isAdmin'] });
    if (!user) throw HttpError.unauthorized('User not found');
    if (!user.isAdmin) throw HttpError.forbidden('Administrator rights required');
    next();
});

export default requireAdmin;
