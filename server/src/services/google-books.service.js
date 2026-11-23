/**
 * Extra book metadata (publisher, year, pages, language, a Google Play offer) from the Google
 * Books API, fetched server-side so the API key never ships in the client bundle.
 * Lookups use the ISBN stored in the database (clients can't choose the URL) and are cached.
 */
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { findBookOrThrow } from './book.service.js';

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const TIMEOUT_MS = 5000;
const CACHE_SIZE = 2000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** isbn -> { value, expiresAt }; Map order doubles as least-recently-used order. */
const cache = new Map();

/** Maps a Google Books volume to the fields the book page shows. Pure function. */
export const toExternalInfo = (volume) => {
    if (!volume) return null;
    const { volumeInfo = {}, saleInfo = {} } = volume;
    const price = saleInfo.retailPrice ?? saleInfo.listPrice;
    const year = Number.parseInt(volumeInfo.publishedDate, 10);
    return {
        publisher: volumeInfo.publisher ?? null,
        year: Number.isFinite(year) ? year : null,
        pageCount: volumeInfo.pageCount || null,
        language: volumeInfo.language?.toUpperCase() ?? null,
        offer: price && saleInfo.buyLink?.startsWith('https://')
            ? { amount: price.amount, currency: price.currencyCode, url: saleInfo.buyLink }
            : null,
    };
};

const lookup = async (isbn) => {
    const query = new URLSearchParams({ q: `isbn:${isbn}` });
    if (config.googleBooks.apiKey) query.set('key', config.googleBooks.apiKey);
    try {
        const response = await fetch(`${ENDPOINT}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!response.ok) {
            logger.warn(`[google-books] lookup answered ${response.status}`);
            return { value: null, cacheable: response.status === 404 };
        }
        const data = await response.json();
        return { value: toExternalInfo(data.items?.[0]), cacheable: true };
    } catch (error) {
        logger.warn(`[google-books] lookup failed: ${error.message}`);
        return { value: null, cacheable: false };
    }
};

/** External metadata for a catalogue book, or null when unknown/unavailable. */
export const getExternalInfo = async (bookId) => {
    const { isbn } = await findBookOrThrow(bookId, { attributes: ['isbn'] });
    const normalized = isbn?.replace(/[^0-9Xx]/g, '');
    if (!normalized) return null;

    const cached = cache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const { value, cacheable } = await lookup(normalized);
    if (cacheable) {
        cache.delete(normalized);
        cache.set(normalized, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
    }
    return value;
};
