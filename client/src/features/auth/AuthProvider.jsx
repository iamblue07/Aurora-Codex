import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { clearToken, getToken, setToken, subscribeToToken } from '@/shared/api/auth-token';
import { msUntilExpiry } from '@/shared/lib/jwt';
import { queryKeys } from '@/shared/lib/query-keys';
import { authApi } from './api';
import { AuthContext } from './auth-context';

/** Renew the token this long before it expires, if the user was active since it was issued. */
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown'];

/**
 * Owns the session: the JWT (persisted in localStorage) and the current user (`GET /api/me`).
 * Active users get a fresh token shortly before it expires; idle sessions end when the token
 * expires or the API answers 401.
 */
export default function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const token = useSyncExternalStore(subscribeToToken, getToken);

    const meQuery = useQuery({
        queryKey: queryKeys.me,
        queryFn: authApi.getMe,
        enabled: Boolean(token),
        staleTime: 5 * 60_000,
    });

    const signIn = useCallback(({ token: newToken, user }) => {
        setToken(newToken);
        if (user) queryClient.setQueryData(queryKeys.me, user);
    }, [queryClient]);

    const signOut = useCallback(() => {
        clearToken();
        queryClient.removeQueries({ queryKey: ['me'] });
    }, [queryClient]);

    // Track activity: an idle tab must not stay signed in forever.
    const lastActivity = useRef(Date.now());
    useEffect(() => {
        const markActive = () => { lastActivity.current = Date.now(); };
        ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
        return () => ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
    }, []);

    useEffect(() => {
        if (!token) return undefined;
        const issuedAt = Date.now();
        const remaining = msUntilExpiry(token);
        const refreshTimer = setTimeout(async () => {
            if (lastActivity.current < issuedAt) return; // idle: let it expire
            try {
                signIn(await authApi.refresh());
            } catch {
                // Expired or revoked meanwhile: the expiry timer below ends the session.
            }
        }, Math.max(0, remaining - REFRESH_BEFORE_EXPIRY_MS));
        // Log out exactly when the token expires instead of polling for it.
        const expiryTimer = setTimeout(clearToken, remaining);
        return () => {
            clearTimeout(refreshTimer);
            clearTimeout(expiryTimer);
        };
    }, [token, signIn]);

    // A valid token for an account that no longer exists: end the session.
    useEffect(() => {
        if (meQuery.error?.status === 404) clearToken();
    }, [meQuery.error]);

    // Forget everything that belonged to the previous user when the session ends.
    useEffect(() => {
        if (!token) queryClient.removeQueries({ queryKey: ['me'] });
    }, [token, queryClient]);

    const value = useMemo(() => ({
        token,
        user: token ? meQuery.data ?? null : null,
        isAuthenticated: Boolean(token),
        isAdmin: Boolean(token && meQuery.data?.isAdmin),
        isLoadingUser: Boolean(token) && meQuery.isPending,
        permissions: meQuery.data?.permissions ?? {},
        signIn,
        signOut,
    }), [token, meQuery.data, meQuery.isPending, signIn, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
