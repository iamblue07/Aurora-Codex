import { serializeAccount } from '../serializers/index.js';
import * as userService from '../services/user.service.js';
import { wrapController } from '../utils/async-handler.js';
import HttpError from '../utils/http-error.js';
import {
    parseEmail,
    parseExistingPassword,
    parseLoginEmail,
    parseNewPassword,
    parseUsername,
} from '../validators/account.validators.js';

export default wrapController({
    /** POST /api/auth/availability — tells whether an email and/or username is still free. */
    async checkAvailability(req, res) {
        const { email, username } = req.body ?? {};
        if (email === undefined && username === undefined) {
            throw HttpError.badRequest('Provide email and/or username');
        }
        const result = {};
        if (email !== undefined) result.emailAvailable = !await userService.isEmailTaken(parseEmail(email));
        if (username !== undefined) {
            result.usernameAvailable = !await userService.isUsernameTaken(parseUsername(username));
        }
        res.json(result);
    },

    /** POST /api/auth/refresh — a new token for the signed-in user (the old one must still be valid). */
    async refresh(req, res) {
        const { user, token } = await userService.refreshSession(req.user.id);
        res.json({ token, user: serializeAccount(user) });
    },

    /** POST /api/auth/register */
    async register(req, res) {
        const { user, token } = await userService.register({
            email: parseEmail(req.body?.email),
            username: parseUsername(req.body?.username),
            password: parseNewPassword(req.body?.password),
        });
        res.status(201).json({ token, user: serializeAccount(user) });
    },

    /** POST /api/auth/login */
    async login(req, res) {
        const { user, token } = await userService.login({
            email: parseLoginEmail(req.body?.email),
            password: parseExistingPassword(req.body?.password),
        });
        res.json({ token, user: serializeAccount(user) });
    },
});
