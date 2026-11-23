import { http } from '@/shared/api/http-client';

export const authApi = {
    login: (credentials) => http.post('/api/auth/login', credentials, { auth: false }),
    register: (data) => http.post('/api/auth/register', data, { auth: false }),
    checkAvailability: (fields) => http.post('/api/auth/availability', fields, { auth: false }),
    getMe: () => http.get('/api/me'),
    refresh: () => http.post('/api/auth/refresh'),
};
