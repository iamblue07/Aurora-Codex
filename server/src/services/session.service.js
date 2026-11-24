/**
 * Session revocation for stateless JWTs. Every token carries the user's `tokenVersion`; a request
 * is accepted only while that version is still current and the account still exists. Versions are
 * cached briefly so authenticated requests don't all hit the database; changes made here update
 * the cache at once (single API instance).
 */
import { User } from '../models/index.js';

const CACHE_MS = 60 * 1000;
const MAX_ENTRIES = 10_000;
/** userId -> { version: number|null (null = no such user), expiresAt } */
const cache = new Map();

const remember = (userId, version) => {
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(userId, { version, expiresAt: Date.now() + CACHE_MS });
};

/** The user's current session version, or null when the account doesn't exist. */
export const currentSessionVersion = async (userId) => {
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.version;
    const user = await User.findByPk(userId, { attributes: ['id', 'tokenVersion'] });
    const version = user ? user.tokenVersion : null;
    remember(userId, version);
    return version;
};

/** Whether a token with these claims is still valid. */
export const isSessionValid = async ({ id, version }) => (await currentSessionVersion(id)) === version;

/** Invalidates every token issued so far for the user; returns the updated user. */
export const revokeSessions = async (user) => {
    await user.increment('tokenVersion');
    await user.reload({ attributes: ['id', 'tokenVersion'] });
    remember(user.id, user.tokenVersion);
    return user;
};

/** Forgets a cached account (e.g. after it was deleted). */
export const forgetSession = (userId) => cache.delete(userId);
