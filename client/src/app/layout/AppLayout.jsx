import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { LoadingState } from '@/shared/ui';
import Footer from './Footer';
import Header from './Header';
import styles from './AppLayout.module.css';

/**
 * Every full page load starts on a history entry keyed "default", so keying scroll positions
 * by `location.key` alone makes each hard load inherit the previous one's scroll offset.
 * Key that first entry by URL instead; later in-app entries keep their unique keys.
 */
const scrollKey = (location) => (
    location.key === 'default' ? location.pathname + location.search : location.key
);

export default function AppLayout() {
    const { pathname } = useLocation();
    return (
        <div className={styles.shell}>
            <a href="#main" className={styles.skipLink}>Sari la conținut</a>
            <Header />
            <main id="main" className={styles.main}>
                <Suspense fallback={<LoadingState />}>
                    {/* Keyed by path: a new page replays the entrance animation, filters don't. */}
                    <div key={pathname} className={styles.page}>
                        <Outlet />
                    </div>
                </Suspense>
            </main>
            <Footer />
            <ScrollRestoration getKey={scrollKey} />
        </div>
    );
}
