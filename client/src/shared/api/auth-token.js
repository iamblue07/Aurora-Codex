import { isTokenExpired } from '@/shared/lib/jwt';
import storage from '@/shared/lib/storage';

/**
 * Holds the JWT outside React so the HTTP client can read it synchronously.
 * React components subscribe through the AuthProvider.
 */
const STORAGE_KEY = 'auth-token';
const listeners = new Set();

const readInitialToken = () => {
    const stored = storage.get(STORAGE_KEY);
    if (stored && !isTokenExpired(stored)) return stored;
    storage.remove(STORAGE_KEY);
    return null;
};

let currentToken = readInitialToken();

export const getToken = () => currentToken;

export const setToken = (token) => {
    currentToken = token;
    if (token) storage.set(STORAGE_KEY, token);
    else storage.remove(STORAGE_KEY);
    listeners.forEach((listener) => listener(token));
};

export const clearToken = () => setToken(null);

/** Subscribes to token changes; returns an unsubscribe function. */
export const subscribeToToken = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
