import env from '@/shared/config/env';
import { clearToken, getToken } from './auth-token';

/** Error thrown for every failed request; `status` is 0 for network failures. */
export class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

/** Absolute URL for an API path (`/api/...`) or a server-relative asset URL (`/uploads/...`). */
export const apiUrl = (path) => (/^https?:\/\//.test(path) ? path : `${env.apiUrl}${path}`);

const buildQuery = (query) => {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        params.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
    const text = params.toString();
    return text ? `?${text}` : '';
};

/**
 * Thin wrapper around fetch for the REST API:
 * adds the bearer token, (de)serialises JSON, sends FormData as-is and throws ApiError.
 * A 401 on an authenticated request clears the stored token (expired/revoked session).
 */
export async function request(path, { method = 'GET', body, query, signal, auth = true } = {}) {
    const headers = {};
    const token = auth ? getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload;
    if (body instanceof FormData) {
        payload = body;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(apiUrl(path) + buildQuery(query), { method, headers, body: payload, signal });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new ApiError(0, 'Network error');
    }

    if (response.status === 204) return null;

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
        if (response.status === 401 && token) clearToken();
        throw new ApiError(response.status, data?.error ?? response.statusText, data?.details);
    }
    return data;
}

export const http = {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
