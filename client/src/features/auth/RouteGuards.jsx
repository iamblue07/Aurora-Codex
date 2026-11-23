import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { LoadingState } from '@/shared/ui';
import { paths } from '@/app/paths';
import { safeNextPath } from './redirect';
import useAuth from './useAuth';

/** Renders child routes only for signed-in users; others go to the login page and come back after. */
export function RequireAuth() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    if (!isAuthenticated) {
        const next = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`${paths.login}?next=${next}`} replace />;
    }
    return <Outlet />;
}

/** Renders child routes only for administrators. */
export function RequireAdmin() {
    const { isAuthenticated, isAdmin, isLoadingUser } = useAuth();
    if (!isAuthenticated) return <Navigate to={paths.login} replace />;
    if (isLoadingUser) return <LoadingState />;
    if (!isAdmin) return <Navigate to={paths.home} replace />;
    return <Outlet />;
}

/**
 * Keeps signed-in users away from the login page. Right after signing in this guard is what
 * performs the redirect, so it honours `?next=` (the page the user was sent away from).
 */
export function GuestOnly() {
    const { isAuthenticated } = useAuth();
    const [searchParams] = useSearchParams();
    return isAuthenticated ? <Navigate to={safeNextPath(searchParams.get('next'))} replace /> : <Outlet />;
}
