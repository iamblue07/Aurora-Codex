import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    boxPlot,
    mean,
    normalDistributionCurve,
    quantile,
    round,
    standardDeviation,
} from '../../src/utils/statistics.js';

describe('statistics helpers', () => {
    it('computes mean and population standard deviation', () => {
        assert.equal(mean([2, 4, 4, 4, 5, 5, 7, 9]), 5);
        assert.equal(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]), 2);
        assert.equal(mean([]), 0);
        assert.equal(standardDeviation([]), 0);
    });

    it('interpolates quantiles linearly', () => {
        const values = [10, 20, 30, 40];
        assert.equal(quantile(values, 0), 10);
        assert.equal(quantile(values, 1), 40);
        assert.equal(quantile(values, 0.5), 25);
        assert.equal(quantile(values, 0.25), 17.5); // the old implementation returned 15
        assert.equal(quantile([], 0.5), 0);
    });

    it('builds a five-number summary', () => {
        assert.deepEqual(boxPlot([1, 2, 3, 4, 5]), { min: 1, q1: 2, median: 3, q3: 4, max: 5 });
        assert.deepEqual(boxPlot([]), { min: 0, q1: 0, median: 0, q3: 0, max: 0 });
    });

    it('samples a normal curve and peaks at the mean', () => {
        const curve = normalDistributionCurve({ min: 0, max: 10, avg: 5, sd: 1 }, 11);
        assert.equal(curve.length, 11);
        assert.equal(curve[0].price, 0);
        assert.equal(curve[10].price, 10);
        const peak = curve.reduce((best, point) => (point.density > best.density ? point : best));
        assert.equal(peak.price, 5);
        assert.ok(Math.abs(peak.density - 1 / Math.sqrt(2 * Math.PI)) < 1e-12);
    });

    it('returns an empty curve instead of NaN/Infinity for degenerate data', () => {
        assert.deepEqual(normalDistributionCurve({ min: 5, max: 5, avg: 5, sd: 0 }), []);
        for (const point of normalDistributionCurve({ min: 1, max: 9, avg: 5, sd: 2 })) {
            assert.ok(Number.isFinite(point.density));
        }
    });

    it('rounds to the requested decimals', () => {
        assert.equal(round(1.23456), 1.23);
        assert.equal(round(1.5, 0), 2);
    });
});
