import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Returns a callback for "Back" buttons. It steps back through history only when the previous
 * entry belongs to this app; a page opened directly (bookmark, shared link, new tab) starts on
 * the "default" history entry, where going back would leave the site, so it opens `fallback`.
 */
export default function useGoBack(fallback) {
    const navigate = useNavigate();
    const location = useLocation();
    const hasInAppHistory = location.key !== 'default';

    return useCallback(() => {
        if (hasInAppHistory) navigate(-1);
        else navigate(fallback, { replace: true });
    }, [fallback, hasInAppHistory, navigate]);
}
