/**
 * Keeps a free-tier database awake: hosted MySQL services on free plans suspend after a few
 * minutes without queries, and the first request after that waits for a cold start. A trivial
 * `SELECT 1` every 2–4 minutes (randomised, see DB_KEEPALIVE_*_MINUTES) prevents it.
 */
import config from '../config/env.js';
import { startJitteredInterval } from '../utils/jittered-interval.js';
import logger from '../utils/logger.js';
import sequelize from './connection.js';

const MINUTE = 60_000;

/** One keep-alive round trip; failures are logged and retried at the next tick. */
export const pingDatabase = async () => {
    const startedAt = Date.now();
    try {
        await sequelize.query('SELECT 1');
        logger.debug(`[db-keepalive] ping ok in ${Date.now() - startedAt} ms`);
        return true;
    } catch (error) {
        logger.warn(`[db-keepalive] ping failed: ${error.message}`);
        return false;
    }
};

/** Starts the keep-alive schedule (when enabled); returns a function that stops it. */
export const startDatabaseKeepAlive = () => {
    const { enabled, minMinutes, maxMinutes } = config.db.keepAlive;
    if (!enabled) return () => {};
    logger.info(`[db-keepalive] pinging the database every ${minMinutes}–${maxMinutes} minutes`);
    return startJitteredInterval(pingDatabase, { minMs: minMinutes * MINUTE, maxMs: maxMinutes * MINUTE });
};
