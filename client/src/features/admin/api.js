import { http } from '@/shared/api/http-client';

export const adminApi = {
    aiStatus: () => http.get('/api/admin/ai'),
    testAiConnection: () => http.post('/api/admin/ai/test'),
    settings: () => http.get('/api/admin/settings'),
    updateSettings: (changes) => http.patch('/api/admin/settings', changes),
    jobs: (params) => http.get('/api/admin/jobs', { query: params }),
    startJob: ({ type, params }) => http.post('/api/admin/jobs', { type, params }),
    cancelJob: (id) => http.post(`/api/admin/jobs/${id}/cancel`),
};

export const JOB_STATUS = {
    running: 'running',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'cancelled',
    interrupted: 'interrupted',
};

export const isRunning = (job) => job?.status === JOB_STATUS.running;
