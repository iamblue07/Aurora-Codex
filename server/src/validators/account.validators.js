import HttpError from '../utils/http-error.js';
import { requireString } from '../utils/validation.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[\p{L}\p{N}_.-]+$/u;

/** Bcrypt only looks at the first 72 bytes of a password. */
const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_LENGTH = 8;

/** An email for a new or changed account: must look like a real address. */
export const parseEmail = (value) => {
    const email = requireString(value, 'email', { maxLength: 255 }).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw HttpError.badRequest('Invalid email address');
    return email;
};

export const parseUsername = (value) => {
    const username = requireString(value, 'username', { minLength: 3, maxLength: 64 });
    if (!USERNAME_PATTERN.test(username)) {
        throw HttpError.badRequest('Username may only contain letters, digits, ".", "_" and "-"');
    }
    return username;
};

export const parseNewPassword = (value) => {
    if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(value) > MAX_PASSWORD_BYTES) {
        throw HttpError.badRequest(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_BYTES} characters long`);
    }
    return value;
};

/**
 * The email typed to sign in. Only presence is checked: accounts created before the format rule
 * existed (e.g. `name@test`) must still be able to log in.
 */
export const parseLoginEmail = (value) => requireString(value, 'email', { maxLength: 255 }).toLowerCase();

/**
 * A password typed to authenticate (login, password change): only presence is checked, and it is
 * never trimmed, because spaces are part of the password that was hashed at registration.
 */
export const parseExistingPassword = (value, field = 'password') => {
    if (typeof value !== 'string' || value.length === 0) throw HttpError.badRequest(`${field} is required`);
    if (value.length > 1024) throw HttpError.badRequest(`${field} must be at most 1024 characters long`);
    return value;
};
