import { http } from '@/shared/api/http-client';

export const listingsApi = {
    search: (params, signal) => http.get('/api/listings', { query: params, signal }),
    get: (id) => http.get(`/api/listings/${id}`),
    mine: () => http.get('/api/me/listings'),
    create: (formData) => http.post('/api/listings', formData),
    update: (id, changes) => http.patch(`/api/listings/${id}`, changes),
    close: (id) => http.post(`/api/listings/${id}/close`),
    remove: (id) => http.delete(`/api/listings/${id}`),
    myChat: (id) => http.get(`/api/listings/${id}/chat`),
    startChat: (id, message) => http.post(`/api/listings/${id}/chats`, { message }),
};

export const LISTING_SORT_OPTIONS = [
    { value: 'newest', label: 'Cele mai noi' },
    { value: 'oldest', label: 'Cele mai vechi' },
    { value: 'price_asc', label: 'Preț crescător' },
    { value: 'price_desc', label: 'Preț descrescător' },
];
