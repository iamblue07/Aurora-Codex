import { http } from '@/shared/api/http-client';

export const chatsApi = {
    mine: () => http.get('/api/me/chats'),
    get: (id) => http.get(`/api/chats/${id}`),
    setOpen: (id, isOpen) => http.patch(`/api/chats/${id}`, { isOpen }),
    messages: (id) => http.get(`/api/chats/${id}/messages`),
    send: (id, content) => http.post(`/api/chats/${id}/messages`, { content }),
    sendFile: (id, file) => {
        const data = new FormData();
        data.append('file', file);
        return http.post(`/api/chats/${id}/media`, data);
    },
};
