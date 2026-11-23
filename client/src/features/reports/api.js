import { http } from '@/shared/api/http-client';

export const reportsApi = {
    create: (report) => http.post('/api/reports', report),
    list: (params) => http.get('/api/reports', { query: params }),
    get: (id) => http.get(`/api/reports/${id}`),
    setOpen: (id, isOpen) => http.patch(`/api/reports/${id}`, { isOpen }),
};

export const moderationApi = {
    setPermission: (userId, permission, granted) => http.put(`/api/admin/users/${userId}/permissions/${permission}`, { granted }),
    removeForumMessage: (messageId) => http.delete(`/api/admin/forum-messages/${messageId}`),
    deleteListing: (listingId) => http.delete(`/api/admin/listings/${listingId}`),
    deleteForum: (forumId) => http.delete(`/api/admin/forums/${forumId}`),
};

/** Romanian labels for the kinds of content that can be reported. */
export const REPORT_TARGET_LABELS = {
    chat_message: 'Mesaj din conversație',
    forum_message: 'Mesaj din forum',
    forum: 'Forum',
    listing: 'Anunț din bazar',
};

/** Permission revoked for each kind of offending content. */
export const PERMISSION_FOR_TARGET = {
    chat_message: 'sendMessages',
    forum_message: 'sendMessages',
    forum: 'createForums',
    listing: 'createListings',
};

export const PERMISSION_LABELS = {
    createListings: 'publicarea anunțurilor',
    createForums: 'crearea forumurilor',
    sendMessages: 'trimiterea mesajelor',
    report: 'raportarea conținutului',
};
