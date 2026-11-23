import { http } from '@/shared/api/http-client';

export const forumsApi = {
    list: (params, signal) => http.get('/api/forums', { query: params, signal }),
    mine: (params) => http.get('/api/me/forums', { query: params }),
    get: (id) => http.get(`/api/forums/${id}`),
    create: (title) => http.post('/api/forums', { title }),
    update: (id, changes) => http.patch(`/api/forums/${id}`, changes),
    messages: (id, params) => http.get(`/api/forums/${id}/messages`, { query: params }),
    post: (id, content) => http.post(`/api/forums/${id}/messages`, { content }),
};
