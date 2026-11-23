/** localStorage wrapper that never throws (private mode, blocked storage, SSR). */
const storage = {
    get(key) {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // Storage unavailable: the value simply isn't persisted.
        }
    },
    remove(key) {
        try {
            window.localStorage.removeItem(key);
        } catch {
            // Ignore.
        }
    },
};

export default storage;
