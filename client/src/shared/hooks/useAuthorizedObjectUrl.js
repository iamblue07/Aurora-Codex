import { useEffect, useState } from 'react';
import { getToken } from '@/shared/api/auth-token';
import { apiUrl } from '@/shared/api/http-client';

/**
 * Loads a protected file (e.g. chat media) with the bearer token and exposes it as an object URL.
 * The URL is revoked when the component unmounts or the source changes (no memory leaks).
 */
export default function useAuthorizedObjectUrl(path) {
    const [state, setState] = useState({ url: null, type: null, error: false });

    useEffect(() => {
        if (!path) return undefined;
        const controller = new AbortController();
        let objectUrl = null;

        fetch(apiUrl(path), {
            headers: { Authorization: `Bearer ${getToken()}` },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.blob();
            })
            .then((blob) => {
                objectUrl = URL.createObjectURL(blob);
                setState({ url: objectUrl, type: blob.type, error: false });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setState({ url: null, type: null, error: true });
            });

        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [path]);

    return state;
}
