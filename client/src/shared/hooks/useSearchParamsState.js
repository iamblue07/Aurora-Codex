import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Keeps a page's filter state in the URL query string, so filtered views can be shared,
 * survive reloads and work with the browser's back button.
 *
 * `defaults` defines the known keys; values equal to their default are omitted from the URL.
 * Changing any filter other than `page` resets `page` to 1.
 */
export default function useSearchParamsState(defaults) {
    const [searchParams, setSearchParams] = useSearchParams();

    const state = useMemo(() => {
        const result = {};
        for (const [key, fallback] of Object.entries(defaults)) {
            const raw = searchParams.get(key);
            if (raw === null) result[key] = fallback;
            else if (Array.isArray(fallback)) result[key] = raw.split(',').filter(Boolean);
            else if (typeof fallback === 'number') result[key] = Number(raw) || fallback;
            else result[key] = raw;
        }
        return result;
        // `defaults` is a module-level constant in every caller.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const update = useCallback((changes) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            const merged = { ...changes };
            if (!('page' in changes) && 'page' in defaults) merged.page = defaults.page;
            for (const [key, value] of Object.entries(merged)) {
                const fallback = defaults[key];
                const isDefault = Array.isArray(value)
                    ? value.length === 0
                    : value === fallback || value === '' || value === null || value === undefined;
                if (isDefault) next.delete(key);
                else next.set(key, Array.isArray(value) ? value.join(',') : String(value));
            }
            return next;
        }, { replace: false });
    }, [setSearchParams, defaults]);

    const reset = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

    return [state, update, reset];
}
