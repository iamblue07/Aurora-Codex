import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEEP_ALIVE_MAX_MS, KEEP_ALIVE_MIN_MS, startBackendKeepAlive } from './keep-alive';

describe('startBackendKeepAlive', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('pings between 2 and 4 minutes apart, repeatedly, until stopped', async () => {
        const ping = vi.fn().mockResolvedValue({ ok: true });
        const randoms = [0, 0.999999];
        const stop = startBackendKeepAlive({ ping, random: () => randoms.shift() ?? 0.5 });

        await vi.advanceTimersByTimeAsync(KEEP_ALIVE_MIN_MS - 1);
        expect(ping).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(ping).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(KEEP_ALIVE_MAX_MS);
        expect(ping).toHaveBeenCalledTimes(2);

        stop();
        await vi.advanceTimersByTimeAsync(KEEP_ALIVE_MAX_MS * 3);
        expect(ping).toHaveBeenCalledTimes(2);
    });

    it('keeps going when the server is unreachable and skips pings while offline', async () => {
        const ping = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        const stop = startBackendKeepAlive({ ping, minMs: 1000, maxMs: 1000 });

        await vi.advanceTimersByTimeAsync(2000);
        expect(ping).toHaveBeenCalledTimes(2);

        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        await vi.advanceTimersByTimeAsync(3000);
        expect(ping).toHaveBeenCalledTimes(2);
        stop();
    });
});
