import { useEffect, useState } from 'react';

const prefersReducedMotion = () => {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

/**
 * Animates a number from 0 to `target` (ease-out, ~0.9 s) when it first appears or changes.
 * Returns `target` straight away for users who asked for reduced motion.
 */
export default function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
    const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

    useEffect(() => {
        if (typeof target !== 'number' || !Number.isFinite(target) || prefersReducedMotion()) {
            setValue(target);
            return undefined;
        }
        const factor = 10 ** decimals;
        let frame;
        const start = performance.now();
        const tick = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - progress) ** 3;
            setValue(Math.round(target * eased * factor) / factor);
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, duration, decimals]);

    return value;
}
