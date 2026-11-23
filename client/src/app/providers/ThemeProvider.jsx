import { useCallback, useEffect, useMemo, useState } from 'react';
import storage from '@/shared/lib/storage';
import { ThemeContext } from './theme-context';

const STORAGE_KEY = 'theme';
const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/**
 * Light/dark theme. Follows the OS preference until the user picks one explicitly.
 * index.html applies the same logic before first paint, so there is no flash.
 */
export default function ThemeProvider({ children }) {
    const [preference, setPreference] = useState(() => storage.get(STORAGE_KEY));
    const [system, setSystem] = useState(systemTheme);
    const theme = preference === 'light' || preference === 'dark' ? preference : system;

    useEffect(() => {
        const media = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!media) return undefined;
        const onChange = () => setSystem(media.matches ? 'dark' : 'light');
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#110f10' : '#EE2E31');
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        storage.set(STORAGE_KEY, next);
        setPreference(next);
    }, [theme]);

    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
