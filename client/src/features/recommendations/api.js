import { http } from '@/shared/api/http-client';

export const recommendationsApi = {
    /** `{ items: [{ book, score, reason, reasonBook }], run, dismissedCount }` */
    list: () => http.get('/api/me/recommendations'),
    /** Without `query` the server uses the reader's ratings and favourite genres. */
    generate: ({ query, sentiment, personalized } = {}) => http.post(
        '/api/me/recommendations',
        query ? { query, sentiment, personalized } : {},
    ),
    dismiss: (bookId) => http.delete(`/api/me/recommendations/${bookId}`),
    clearDismissals: () => http.delete('/api/me/recommendation-dismissals'),
    similar: (bookId, limit = 8) => http.get(`/api/books/${bookId}/similar`, { query: { limit }, auth: false }),
};

/** Ideas for the "describe it" box (Romanian, like the catalogue). */
export const QUERY_IDEAS = [
    "o poveste de dragoste în Parisul anilor '20",
    'un thriller psihologic cu final neașteptat',
    'SF despre colonizarea altor planete',
    'roman istoric despre România interbelică',
    'carte de dezvoltare personală despre obiceiuri',
    'fantasy cu dragoni și magie, pentru adolescenți',
];

/** How well a recommendation fits (0–1 score within its list): a short label and a tier. */
export const matchLevel = (score) => {
    if (score === null || score === undefined) return null;
    if (score >= 0.85) return { label: 'Excelentă', tier: 'high' };
    if (score >= 0.65) return { label: 'Foarte bună', tier: 'mid' };
    return { label: 'Bună', tier: 'low' };
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
