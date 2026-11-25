import '../helpers/env.js';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const { pingSelf, startKeepAwake } = await import('../../src/services/keep-awake.js');
const { isTransientConnectionError } = await import('../../src/database/connection.js');
const { AccessDeniedError, ConnectionError, ConnectionRefusedError, DatabaseError } = await import('sequelize');

const MINUTE = 60_000;

describe('keep-awake', () => {
    it('pings the URL every min–max minutes and retries soon after a failure', async () => {
        mock.timers.enable({ apis: ['setTimeout'] });
        try {
            const results = [true, false, true];
            const ping = mock.fn(() => Promise.resolve(results.shift() ?? true));
            const stop = startKeepAwake({
                url: 'https://api.example.com', enabled: true, minMs: 5 * MINUTE, maxMs: 9 * MINUTE,
                retryMs: MINUTE, random: () => 0, ping,
            });
            const tick = async (ms) => { mock.timers.tick(ms); await new Promise(setImmediate); };

            await tick(5 * MINUTE - 1);
            assert.equal(ping.mock.callCount(), 0);
            await tick(1);
            assert.equal(ping.mock.callCount(), 1);
            assert.equal(ping.mock.calls[0].arguments[0], 'https://api.example.com');
            await tick(5 * MINUTE); // second ping fails…
            assert.equal(ping.mock.callCount(), 2);
            await tick(MINUTE); // …so the third comes a minute later
            assert.equal(ping.mock.callCount(), 3);

            stop();
            await tick(30 * MINUTE);
            assert.equal(ping.mock.callCount(), 3);
        } finally {
            mock.timers.reset();
        }
    });

    it('does nothing without a URL or when disabled', () => {
        const ping = mock.fn();
        startKeepAwake({ url: null, enabled: true, ping })();
        startKeepAwake({ url: 'https://api.example.com', enabled: false, ping })();
        assert.equal(ping.mock.callCount(), 0);
    });

    it('reports a ping as failed on an error status or a network error, without throwing', async () => {
        const urls = [];
        const ok = await pingSelf('https://api.example.com', {
            fetchImpl: (url) => { urls.push(url); return Promise.resolve({ ok: true, status: 200 }); },
        });
        assert.equal(ok, true);
        assert.deepEqual(urls, ['https://api.example.com/health']);
        assert.equal(await pingSelf('https://x', { fetchImpl: () => Promise.resolve({ ok: false, status: 503 }) }), false);
        assert.equal(await pingSelf('https://x', { fetchImpl: () => Promise.reject(new Error('ECONNRESET')) }), false);
    });
});

describe('database connection retries', () => {
    it('retries failures to connect, but not wrong credentials or failed queries', () => {
        assert.equal(isTransientConnectionError(new ConnectionRefusedError(new Error('ECONNREFUSED'))), true);
        assert.equal(isTransientConnectionError(new ConnectionError(new Error('ETIMEDOUT'))), true);
        assert.equal(isTransientConnectionError(new AccessDeniedError(new Error('denied'))), false);
        assert.equal(isTransientConnectionError(new DatabaseError(new Error('Connection lost'))), false);
    });
});
