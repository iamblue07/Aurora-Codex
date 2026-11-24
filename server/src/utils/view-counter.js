/**
 * Remembers who saw what recently, so a page view is counted at most once per visitor and item
 * within `windowMs`. In memory only: a restart simply starts a new window.
 *
 * @returns {(key: string) => boolean} true when this view should be counted
 */
export const createViewCounter = ({ windowMs = 30 * 60 * 1000, maxEntries = 20_000 } = {}) => {
    const seen = new Map();
    return (key) => {
        const now = Date.now();
        if ((seen.get(key) ?? 0) > now) return false;
        if (seen.size >= maxEntries) {
            for (const [entry, expiresAt] of seen) if (expiresAt <= now) seen.delete(entry);
            if (seen.size >= maxEntries) seen.clear();
        }
        seen.set(key, now + windowMs);
        return true;
    };
};
