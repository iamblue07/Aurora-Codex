/**
 * Runs `task` repeatedly, waiting a random delay between `minMs` and `maxMs` before each run.
 * The next run is only scheduled once the previous one finished, so slow runs never overlap.
 * A failing run is reported to `onError` and doesn't stop the schedule.
 * Timers are unref'd: they never keep the process alive on their own.
 *
 * @returns {() => void} stops the schedule
 */
export const startJitteredInterval = (task, { minMs, maxMs, random = Math.random, onError = () => {} }) => {
    if (!(minMs > 0) || !(maxMs >= minMs)) throw new Error('Expected 0 < minMs <= maxMs');
    let timer = null;
    let stopped = false;

    const scheduleNext = () => {
        if (stopped) return;
        const delay = minMs + Math.floor(random() * (maxMs - minMs + 1));
        timer = setTimeout(async () => {
            try {
                await task();
            } catch (error) {
                onError(error);
            }
            scheduleNext();
        }, delay);
        timer.unref?.();
    };

    scheduleNext();
    return () => {
        stopped = true;
        clearTimeout(timer);
    };
};
