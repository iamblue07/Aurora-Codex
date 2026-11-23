/** Pure numeric helpers used by the statistics endpoints. All inputs are plain number arrays. */

export const round = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

export const mean = (values) => (values.length ? values.reduce((sum, x) => sum + x, 0) / values.length : 0);

/** Population standard deviation. */
export const standardDeviation = (values) => {
    if (values.length === 0) return 0;
    const avg = mean(values);
    return Math.sqrt(values.reduce((sum, x) => sum + (x - avg) ** 2, 0) / values.length);
};

/** Quantile with linear interpolation between closest ranks. `sortedValues` must be ascending. */
export const quantile = (sortedValues, q) => {
    const n = sortedValues.length;
    if (n === 0) return 0;
    const position = (n - 1) * q;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * weight;
};

/** Five-number summary for a box plot. `sortedValues` must be ascending. */
export const boxPlot = (sortedValues) => ({
    min: sortedValues[0] ?? 0,
    q1: quantile(sortedValues, 0.25),
    median: quantile(sortedValues, 0.5),
    q3: quantile(sortedValues, 0.75),
    max: sortedValues[sortedValues.length - 1] ?? 0,
});

/**
 * Samples the normal probability density N(avg, sd) at `points` evenly spaced prices between min and max.
 * Degenerate inputs (no spread) return an empty curve instead of NaN/Infinity values.
 */
export const normalDistributionCurve = ({ min, max, avg, sd }, points = 50) => {
    if (!(sd > 0) || !(max > min)) return [];
    const step = (max - min) / (points - 1);
    const coefficient = 1 / (sd * Math.sqrt(2 * Math.PI));
    return Array.from({ length: points }, (_, i) => {
        const x = min + step * i;
        return {
            price: round(x),
            density: coefficient * Math.exp(-((x - avg) ** 2) / (2 * sd ** 2)),
        };
    });
};
