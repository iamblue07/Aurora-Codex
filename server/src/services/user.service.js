import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import config from '../config/env.js';
import { FavoriteGenre, User } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { removeStoredFile } from '../utils/files.js';
import { revokeSessions } from './session.service.js';
import { signToken } from './token.service.js';

export const hashPassword = (password) => bcrypt.hash(password, config.auth.bcryptRounds);

/**
 * A real bcrypt hash of a random value, compared against when the email is unknown: login then
 * takes as long for unknown emails as for wrong passwords, so timing reveals no accounts.
 */
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), config.auth.bcryptRounds);

export const findUserOrThrow = async (userId, options = {}) => {
    const user = await User.findByPk(userId, options);
    if (!user) throw HttpError.notFound('User not found');
    return user;
};

/** Throws 403 unless the given permission flag (e.g. `canCreateForums`) is enabled for the user. */
export const assertPermission = (user, permission, message) => {
    if (!user[permission]) throw HttpError.forbidden(message);
};

/** Loads the user and checks a permission in one step. */
export const findUserWithPermission = async (userId, permission, message) => {
    const user = await findUserOrThrow(userId);
    assertPermission(user, permission, message);
    return user;
};

export const isEmailTaken = async (email) => (await User.count({ where: { email } })) > 0;

export const isUsernameTaken = async (username) => (await User.count({ where: { username } })) > 0;

export const register = async ({ email, username, password }) => {
    if (await isEmailTaken(email)) throw HttpError.conflict('Email already registered');
    if (await isUsernameTaken(username)) throw HttpError.conflict('Username already taken');

    const user = await User.create({ email, username, passwordHash: await hashPassword(password) });
    return { user, token: signToken(user) };
};

export const login = async ({ email, password }) => {
    const user = await User.scope('withPassword').findOne({ where: { email } });
    // Same message and (roughly) the same time in both cases: no way to discover registered emails.
    const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !isValid) throw HttpError.unauthorized('Invalid email or password');
    // Hashes made with an older, cheaper cost are upgraded transparently on the next login.
    if (bcrypt.getRounds(user.passwordHash) < config.auth.bcryptRounds) {
        user.passwordHash = await hashPassword(password);
        await user.save();
    }
    return { user, token: signToken(user) };
};

/** A fresh token for an existing account (deleted accounts can't renew their session). */
export const refreshSession = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) throw HttpError.unauthorized('Account no longer exists');
    return { user, token: signToken(user) };
};

export const updateProfile = async (userId, { description }) => {
    const user = await findUserOrThrow(userId);
    user.description = description;
    await user.save();
    return user;
};

/**
 * Changes the password and signs the user out everywhere else; returns a fresh token for the
 * current device. A wrong current password is a 403 (not 401: the session itself is fine).
 */
export const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await User.scope('withPassword').findByPk(userId);
    if (!user) throw HttpError.notFound('User not found');
    if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
        throw HttpError.forbidden('Current password is incorrect');
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    return signToken(await revokeSessions(user));
};

/** "Sign out everywhere": every existing token stops working; returns a new one for this device. */
export const signOutEverywhere = async (userId) => {
    const user = await findUserOrThrow(userId);
    return signToken(await revokeSessions(user));
};

/** Replaces the avatar and deletes the previous file from disk. */
export const updateAvatar = async (userId, storedPath) => {
    const user = await findUserOrThrow(userId);
    const previousPath = user.avatarPath;
    user.avatarPath = storedPath;
    await user.save();
    if (previousPath && previousPath !== storedPath) await removeStoredFile(previousPath);
    return user;
};

export const getAvatarPath = async (userId) => {
    const user = await findUserOrThrow(userId, { attributes: ['avatarPath'] });
    if (!user.avatarPath) throw HttpError.notFound('User has no avatar');
    return user.avatarPath;
};

export const getPublicProfile = async (userId) => {
    const user = await findUserOrThrow(userId, {
        include: [{ model: FavoriteGenre, as: 'favoriteGenres', attributes: ['genre', 'position'] }],
        order: [[{ model: FavoriteGenre, as: 'favoriteGenres' }, 'position', 'ASC']],
    });
    return { user, favoriteGenres: user.favoriteGenres.map((favorite) => favorite.genre) };
};
