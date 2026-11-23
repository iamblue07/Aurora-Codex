/**
 * Rate limits. Every limiter answers 429 `{ error }` with standard `RateLimit-*` headers.
 *
 * - The whole API has a generous per-IP ceiling against floods and scraping.
 * - Credential endpoints are tight per IP (brute force).
 * - Content creation, uploads and password changes are limited per signed-in user.
 * - Endpoints that call the paid AI provider have per-user short and daily budgets plus a global
 *   hourly cap, so neither one account nor many accounts together can run up the bill.
 *
 * Counters live in memory: fine for the single-process deployment; a shared store (Redis)
 * would be needed when running several instances.
 */
import rateLimit from 'express-rate-limit';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DEFAULT_MESSAGE = 'Too many requests, please try again later';

const createLimiter = ({ windowMs, limit, keyGenerator, message = DEFAULT_MESSAGE }) => rateLimit({
    windowMs,
    limit,
    // Without a key generator the library counts per client IP.
    ...(keyGenerator && { keyGenerator }),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
});

/** Signed-in requests count per user (several users may share an IP); others per IP. */
const perUser = (req) => (req.user ? `user:${req.user.id}` : `ip:${req.ip}`);

/** Ceiling for every /api request from one IP (pages poll chats and job progress, so it is generous). */
export const apiRateLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 1500 });

/** Slows down brute-force attempts against login and registration. */
export const credentialsRateLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 20 });

/** Availability checks may run while the user types, so they get a looser budget. */
export const availabilityRateLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 300 });

/** Guessing the current password with a stolen session must be slow too. */
export const passwordChangeRateLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, keyGenerator: perUser });

/** Posts, messages, listings, forums, reports: blocks spam floods, invisible to normal use. */
export const contentRateLimiter = createLimiter({ windowMs: 10 * MINUTE, limit: 60, keyGenerator: perUser });

/** Image and file uploads (processing them costs CPU). */
export const uploadRateLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 20, keyGenerator: perUser });

/** AI recommendations, per user: a burst budget and a daily budget. */
export const aiUserRateLimiters = [
    createLimiter({ windowMs: 15 * MINUTE, limit: 10, keyGenerator: perUser }),
    createLimiter({ windowMs: DAY, limit: 60, keyGenerator: perUser }),
];

/** AI requests from everyone together: a hard cap on what the API key can be made to spend. */
export const aiGlobalRateLimiter = createLimiter({
    windowMs: HOUR,
    limit: 600,
    keyGenerator: () => 'global',
    message: 'The AI service is busy, please try again later',
});

/** Admin actions that call the AI provider or start background jobs. */
export const adminActionRateLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 30, keyGenerator: perUser });
