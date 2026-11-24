import { http } from '@/shared/api/http-client';

export const forumsApi = {
    board: () => http.get('/api/forums/categories'),
    list: (params, signal) => http.get('/api/forums', { query: params, signal }),
    mine: (params) => http.get('/api/me/forums', { query: params }),
    get: (id) => http.get(`/api/forums/${id}`),
    create: (thread) => http.post('/api/forums', thread),
    update: (id, changes) => http.patch(`/api/forums/${id}`, changes),
    messages: (id, params) => http.get(`/api/forums/${id}/messages`, { query: params }),
    post: (id, { content, replyToId }) => http.post(`/api/forums/${id}/messages`, { content, replyToId }),
    editMessage: (messageId, content) => http.patch(`/api/forums/messages/${messageId}`, { content }),
    deleteMessage: (messageId) => http.delete(`/api/forums/messages/${messageId}`),
    setLike: (messageId, liked) => (liked
        ? http.put(`/api/forums/messages/${messageId}/like`)
        : http.delete(`/api/forums/messages/${messageId}/like`)),
};
