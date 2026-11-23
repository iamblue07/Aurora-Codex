import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { startJitteredInterval } from '../../src/utils/jittered-interval.js';

const MINUTE = 60_000;
const flush = () => new Promise((resolve) => { setImmediate(resolve); });

describe('startJitteredInterval', () => {
    beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
    afterEach(() => mock.timers.reset());

    it('runs the task after a delay drawn between min and max, again and again', async () => {
        const randoms = [0, 0.999999, 0.5];
        let runs = 0;
        const stop = startJitteredInterval(() => { runs += 1; }, {
            minMs: 2 * MINUTE, maxMs: 4 * MINUTE, random: () => randoms.shift() ?? 0.5,
        });

        mock.timers.tick(2 * MINUTE - 1);
        assert.equal(runs, 0);
        mock.timers.tick(1); // first delay: exactly the minimum
        await flush();
        assert.equal(runs, 1);

        mock.timers.tick(4 * MINUTE - 1); // second delay: the maximum
        await flush();
        assert.equal(runs, 1);
        mock.timers.tick(1);
        await flush();
        assert.equal(runs, 2);

        stop();
        mock.timers.tick(10 * MINUTE);
        await flush();
        assert.equal(runs, 2);
    });

    it('keeps going after a failing run', async () => {
        let runs = 0;
        const errors = [];
        const stop = startJitteredInterval(() => {
            runs += 1;
            throw new Error('database asleep');
        }, { minMs: 1000, maxMs: 1000, onError: (error) => errors.push(error.message) });
        for (let i = 0; i < 3; i += 1) {
            mock.timers.tick(1000);
            await flush();
        }
        stop();
        assert.equal(runs, 3);
        assert.deepEqual(errors, ['database asleep', 'database asleep', 'database asleep']);
    });

    it('rejects invalid bounds', () => {
        assert.throws(() => startJitteredInterval(() => {}, { minMs: 0, maxMs: 10 }));
        assert.throws(() => startJitteredInterval(() => {}, { minMs: 10, maxMs: 5 }));
    });
});
