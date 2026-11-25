/**
 * Keeps a free Render web service from sleeping. Render stops a free instance after 15 minutes
 * without *incoming* HTTP traffic; outgoing traffic (database keep-alive, AI calls, jobs) doesn't
 * count. So the server calls its own public address (`RENDER_EXTERNAL_URL`, set by Render, or
 * KEEP_AWAKE_URL) every few minutes: the request goes out and comes back in through Render's
 * proxy, which counts as traffic. A failed ping is retried soon instead of at the next tick, so
 * one network hiccup never leaves a 15-minute gap.
 *
 * This only works while the server runs: an outside monitor (see .github/workflows/keep-awake.yml)
 * wakes it up again after Render restarts or stops it anyway.
 */
import config from '../config/env.js';
import logger from '../utils/logger.js';

const MINUTE = 60_000;
const PING_TIMEOUT_MS = 30_000;

/** One ping of `<url>/health`; resolves to true when it answered 2xx. Never throws. */
export const pingSelf = async (url, { fetchImpl = fetch, timeoutMs = PING_TIMEOUT_MS } = {}) => {
    const startedAt = Date.now();
    try {
        const response = await fetchImpl(`${url}/health`, {
            headers: { 'User-Agent': 'aurora-codex-keep-awake' },
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        logger.debug(`[keep-awake] ping ok in ${Date.now() - startedAt} ms`);
        return true;
    } catch (error) {
        logger.warn(`[keep-awake] ping failed: ${error.message}`);
        return false;
    }
};

/**
 * Pings every `minMs`–`maxMs` (random), or after `retryMs` when the last ping failed.
 * Timers are unref'd. Returns a function that stops the schedule; a no-op without a URL.
 */
export const startKeepAwake = ({
    url = config.keepAwake.url,
    enabled = config.keepAwake.enabled,
    minMs = config.keepAwake.minMinutes * MINUTE,
    maxMs = config.keepAwake.maxMinutes * MINUTE,
    retryMs = MINUTE,
    random = Math.random,
    ping = (target) => pingSelf(target),
} = {}) => {
    if (!enabled || !url) return () => {};
    logger.info(`[keep-awake] pinging ${url}/health every ${minMs / MINUTE}–${maxMs / MINUTE} minutes`);

    let timer = null;
    let stopped = false;
    const schedule = (delay) => {
        if (stopped) return;
        timer = setTimeout(async () => {
            const ok = await ping(url);
            schedule(ok ? minMs + Math.floor(random() * (maxMs - minMs + 1)) : retryMs);
        }, delay);
        timer.unref?.();
    };
    schedule(minMs + Math.floor(random() * (maxMs - minMs + 1)));

    return () => {
        stopped = true;
        clearTimeout(timer);
    };
};
