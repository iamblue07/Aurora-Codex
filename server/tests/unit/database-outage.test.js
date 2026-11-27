import '../helpers/env.js';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

const { ConnectionError, ConnectionRefusedError } = await import('sequelize');
const { getDatabaseState, setDatabaseState, waitForDatabase } = await import('../../src/database/connection.js');
const { createApp } = await import('../../src/app.js');
const { errorHandler } = await import('../../src/middleware/error-handler.js');

describe('waiting for the database', () => {
    it('retries with a doubling pause, capped, until it connects', async () => {
        let calls = 0;
        const pauses = [];
        const attempts = await waitForDatabase({
            connect: () => {
                calls += 1;
                return calls < 5 ? Promise.reject(new ConnectionRefusedError(new Error('ECONNREFUSED'))) : Promise.resolve();
            },
            minDelayMs: 2_000,
            maxDelayMs: 10_000,
            sleep: (ms) => { pauses.push(ms); return Promise.resolve(); },
        });
        assert.equal(attempts, 5);
        assert.deepEqual(pauses, [2_000, 4_000, 8_000, 10_000]);
    });

    it('stops waiting when the server shuts down', async () => {
        let stop = false;
        const attempts = await waitForDatabase({
            connect: () => Promise.reject(new Error('down')),
            shouldStop: () => stop,
            sleep: () => { stop = true; return Promise.resolve(); },
        });
        assert.equal(attempts, null);
    });
});

describe('API while the database is unavailable', () => {
    let server;
    let base;
    before(async () => {
        server = createApp().listen(0);
        await new Promise((resolve) => { server.once('listening', resolve); });
        base = `http://127.0.0.1:${server.address().port}`;
    });
    after(() => {
        setDatabaseState('ready');
        server.close();
    });

    it('keeps /health up and answers 503 on /api until the database is ready', async () => {
        assert.equal(getDatabaseState(), 'ready'); // default for tests and scripts
        setDatabaseState('connecting');

        const health = await fetch(`${base}/health`);
        assert.equal(health.status, 200);
        assert.deepEqual(await health.json(), { status: 'ok', database: 'connecting' });

        const api = await fetch(`${base}/api/books`);
        assert.equal(api.status, 503);
        assert.equal(api.headers.get('retry-after'), '30');
        assert.match((await api.json()).error, /database is not available/);
    });

    it('turns a lost database connection into a 503', () => {
        const res = {
            headersSent: false,
            status(code) { this.code = code; return this; },
            json(body) { this.body = body; return this; },
        };
        errorHandler(new ConnectionError(new Error('Connection lost')), { method: 'GET', originalUrl: '/api/x' }, res, () => {});
        assert.equal(res.code, 503);
        assert.match(res.body.error, /database is unavailable/);
    });
});
