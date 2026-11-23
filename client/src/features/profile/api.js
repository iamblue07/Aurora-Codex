import { http } from '@/shared/api/http-client';

export const accountApi = {
    update: (changes) => http.patch('/api/me', changes),
    changePassword: (passwords) => http.put('/api/me/password', passwords),
    uploadAvatar: (file) => {
        const data = new FormData();
        data.append('image', file);
        return http.put('/api/me/avatar', data);
    },
    favoriteGenres: () => http.get('/api/me/favorite-genres'),
    setFavoriteGenres: (genres) => http.put('/api/me/favorite-genres', { genres }),
    readingHistory: () => http.get('/api/me/reading-history'),
};

export const usersApi = {
    profile: (id) => http.get(`/api/users/${id}`),
    listings: (id) => http.get(`/api/users/${id}/listings`),
    forums: (id, params) => http.get(`/api/users/${id}/forums`, { query: params }),
};
