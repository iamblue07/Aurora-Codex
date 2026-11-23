import { http } from '@/shared/api/http-client';

export const recommendationsApi = {
    list: () => http.get('/api/me/recommendations'),
    /** Without `query` the server builds one from the user's favourite genres and reading history. */
    generate: ({ query, sentiment } = {}) => http.post('/api/me/recommendations', query ? { query, sentiment } : {}),
};

/** Emotional tones understood by the recommender, with their Romanian labels. */
export const EMOTIONS = [
    { value: 'joy', label: 'Bucurie', emoji: '😊' },
    { value: 'sadness', label: 'Tristețe', emoji: '😢' },
    { value: 'fear', label: 'Suspans', emoji: '😱' },
    { value: 'surprise', label: 'Surpriză', emoji: '😮' },
    { value: 'anger', label: 'Tensiune', emoji: '😠' },
    { value: 'disgust', label: 'Întunecat', emoji: '🖤' },
    { value: 'neutral', label: 'Echilibrat', emoji: '😌' },
];
