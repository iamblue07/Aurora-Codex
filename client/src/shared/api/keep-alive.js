import { apiUrl } from './http-client';

const MINUTE = 60_000;
export const KEEP_ALIVE_MIN_MS = 2 * MINUTE;
export const KEEP_ALIVE_MAX_MS = 4 * MINUTE;

/**
 * Pings the API's `/health` endpoint every 2–4 minutes (random) while the app is open.
 * Free hosting plans put an idle backend to sleep; regular pings keep it warm, so the next
 * real request doesn't wait for a cold start. Pings are skipped while the browser is offline
 * and their failures are ignored (the next tick simply tries again).
 *
 * @returns {() => void} stops the pings
 */
export function startBackendKeepAlive({
    minMs = KEEP_ALIVE_MIN_MS,
    maxMs = KEEP_ALIVE_MAX_MS,
    random = Math.random,
    ping = () => fetch(apiUrl('/health'), { cache: 'no-store' }),
} = {}) {
    let timer = null;
    let stopped = false;

    const scheduleNext = () => {
        if (stopped) return;
        const delay = minMs + Math.floor(random() * (maxMs - minMs + 1));
        timer = setTimeout(async () => {
            if (navigator.onLine !== false) {
                try {
                    await ping();
                } catch {
                    // Server asleep or unreachable: the next tick tries again.
                }
            }
            scheduleNext();
        }, delay);
    };

    scheduleNext();
    return () => {
        stopped = true;
        clearTimeout(timer);
    };
}
