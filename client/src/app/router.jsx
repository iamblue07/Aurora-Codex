import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAdmin, RequireAuth } from '@/features/auth/RouteGuards';
import AppLayout from './layout/AppLayout';
import RouteErrorPage from './pages/RouteErrorPage';
import { paths } from './paths';

/** Route-level code splitting: each page is loaded on first visit. */
const page = (load) => async () => ({ Component: (await load()).default });

/** The pages most visits continue to: their code is fetched in idle time after the first render. */
const LIKELY_NEXT_PAGES = [
    () => import('@/features/books/pages/CatalogPage'),
    () => import('@/features/books/pages/BookPage'),
    () => import('@/features/marketplace/pages/MarketplacePage'),
    () => import('@/features/marketplace/pages/ListingPage'),
    () => import('@/features/forums/pages/ForumsPage'),
];

export const prefetchLikelyPages = () => {
    const idle = window.requestIdleCallback ?? ((callback) => setTimeout(callback, 1500));
    idle(() => LIKELY_NEXT_PAGES.forEach((load) => load().catch(() => {})));
};

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        errorElement: <RouteErrorPage />,
        children: [
            { path: paths.home, lazy: page(() => import('@/features/home/pages/HomePage')) },
            { path: paths.catalog, lazy: page(() => import('@/features/books/pages/CatalogPage')) },
            { path: paths.book(), lazy: page(() => import('@/features/books/pages/BookPage')) },
            { path: paths.marketplace, lazy: page(() => import('@/features/marketplace/pages/MarketplacePage')) },
            { path: paths.listing(), lazy: page(() => import('@/features/marketplace/pages/ListingPage')) },
            { path: paths.forums, lazy: page(() => import('@/features/forums/pages/ForumsPage')) },
            { path: paths.forum(), lazy: page(() => import('@/features/forums/pages/ForumPage')) },
            { path: paths.user(), lazy: page(() => import('@/features/profile/pages/UserProfilePage')) },
            { path: paths.statistics, lazy: page(() => import('@/features/statistics/pages/StatisticsPage')) },
            {
                element: <GuestOnly />,
                children: [{ path: paths.login, lazy: page(() => import('@/features/auth/pages/AuthPage')) }],
            },
            {
                element: <RequireAuth />,
                children: [
                    { path: paths.createListing, lazy: page(() => import('@/features/marketplace/pages/CreateListingPage')) },
                    { path: paths.myListings, lazy: page(() => import('@/features/marketplace/pages/MyListingsPage')) },
                    { path: paths.chats, lazy: page(() => import('@/features/chats/pages/ChatsPage')) },
                    { path: paths.chat(), lazy: page(() => import('@/features/chats/pages/ChatsPage')) },
                    { path: paths.myForums, lazy: page(() => import('@/features/forums/pages/MyForumsPage')) },
                    { path: paths.profile, lazy: page(() => import('@/features/profile/pages/ProfilePage')) },
                    { path: paths.readingHistory, lazy: page(() => import('@/features/profile/pages/ReadingHistoryPage')) },
                ],
            },
            {
                element: <RequireAdmin />,
                children: [
                    { path: paths.admin, lazy: page(() => import('@/features/admin/pages/AdminPage')) },
                    { path: paths.reports, lazy: page(() => import('@/features/reports/pages/ReportsPage')) },
                ],
            },
            { path: '*', lazy: page(() => import('./pages/NotFoundPage')) },
        ],
    },
]);
