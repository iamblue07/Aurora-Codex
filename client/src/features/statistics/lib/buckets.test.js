import { describe, expect, it } from 'vitest';
import { bucketPrices } from './buckets';

const total = (buckets) => buckets.reduce((sum, bucket) => sum + bucket.count, 0);

describe('bucketPrices', () => {
    it('returns no buckets for no data', () => {
        expect(bucketPrices([])).toEqual([]);
        expect(bucketPrices(undefined)).toEqual([]);
    });

    it('puts everything in one bucket when all prices are equal', () => {
        expect(bucketPrices([{ price: 20, count: 3 }, { price: 20, count: 2 }])).toEqual([
            { from: 20, to: 20, label: '20', count: 5 },
        ]);
    });

    it('splits the range into equal-width buckets and keeps every listing', () => {
        const rows = [{ price: 0, count: 1 }, { price: 15, count: 2 }, { price: 39.5, count: 4 }, { price: 80, count: 3 }];
        const buckets = bucketPrices(rows, 4);

        expect(buckets.map((bucket) => bucket.label)).toEqual(['0–20', '20–40', '40–60', '60–80']);
        expect(buckets.map((bucket) => bucket.count)).toEqual([3, 4, 0, 3]);
        expect(total(buckets)).toBe(10);
    });

    it('counts the maximum price in the last bucket', () => {
        const buckets = bucketPrices([{ price: 1, count: 1 }, { price: 10, count: 1 }], 3);
        expect(buckets.at(-1).count).toBe(1);
        expect(total(buckets)).toBe(2);
    });
});
