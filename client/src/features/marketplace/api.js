import { http } from '@/shared/api/http-client';

export const listingsApi = {
    search: (params, signal) => http.get('/api/listings', { query: params, signal }),
    cities: () => http.get('/api/listings/cities'),
    get: (id) => http.get(`/api/listings/${id}`),
    similar: (id) => http.get(`/api/listings/${id}/similar`),
    mine: () => http.get('/api/me/listings'),
    favorites: (params) => http.get('/api/me/favorite-listings', { query: params }),
    create: (formData) => http.post('/api/listings', formData),
    update: (id, changes) => http.patch(`/api/listings/${id}`, changes),
    addImages: (id, formData) => http.post(`/api/listings/${id}/images`, formData),
    removeImage: (id, imageId) => http.delete(`/api/listings/${id}/images/${imageId}`),
    setCover: (id, imageId) => http.put(`/api/listings/${id}/images/${imageId}/cover`),
    close: (id) => http.post(`/api/listings/${id}/close`),
    remove: (id) => http.delete(`/api/listings/${id}`),
    setFavorite: (id, favorite) => (favorite
        ? http.put(`/api/listings/${id}/favorite`)
        : http.delete(`/api/listings/${id}/favorite`)),
    myChat: (id) => http.get(`/api/listings/${id}/chat`),
    startChat: (id, message) => http.post(`/api/listings/${id}/chats`, { message }),
};
