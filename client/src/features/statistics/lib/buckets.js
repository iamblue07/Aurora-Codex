/**
 * Groups `{ price, count }` rows into `bucketCount` equal-width price ranges for a histogram.
 * Returns `[{ from, to, label, count }]`.
 */
export const bucketPrices = (rows, bucketCount = 8) => {
    if (!rows?.length) return [];
    const prices = rows.map((row) => row.price);
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    if (min === max) return [{ from: min, to: max, label: `${min}`, count: rows.reduce((sum, row) => sum + row.count, 0) }];

    const width = Math.ceil((max - min) / bucketCount);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const from = min + index * width;
        return { from, to: from + width, label: `${from}–${from + width}`, count: 0 };
    }).filter((bucket) => bucket.from <= max);

    for (const { price, count } of rows) {
        const index = Math.min(Math.floor((price - min) / width), buckets.length - 1);
        buckets[index].count += count;
    }
    return buckets;
};
