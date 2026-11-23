import { http } from '@/shared/api/http-client';

export const booksApi = {
    search: (params, signal) => http.get('/api/books', { query: params, signal }),
    byIds: (ids) => http.get('/api/books', { query: { ids } }),
    lookup: (params, signal) => http.get('/api/books/lookup', { query: params, signal }),
    random: () => http.get('/api/books/random'),
    get: (id) => http.get(`/api/books/${id}`),
    offers: (id) => http.get(`/api/books/${id}/offers`),
    listings: (id) => http.get(`/api/books/${id}/listings`),
    /** Publisher, year, pages, language and a Google Play offer (fetched by the server; may be null). */
    externalInfo: (id) => http.get(`/api/books/${id}/external-info`),
    rating: (id) => http.get(`/api/books/${id}/rating`),
    rate: (id, rating) => http.put(`/api/books/${id}/rating`, { rating }),
    removeRating: (id) => http.delete(`/api/books/${id}/rating`),
};
