/** Posts per thread page (the API pages the same way). */
export const POSTS_PER_PAGE = 15;
export const THREADS_PER_PAGE = 20;
export const MAX_POST_LENGTH = 10_000;
export const MAX_TITLE_LENGTH = 160;

/** Page of a thread that holds the post at `position` (1-based). */
export const pageOfPosition = (position) => Math.max(1, Math.ceil(position / POSTS_PER_PAGE));

export const THREAD_SORTS = [
    { value: 'activity', label: 'Activitate recentă' },
    { value: 'newest', label: 'Cele mai noi' },
    { value: 'replies', label: 'Cele mai multe răspunsuri' },
    { value: 'views', label: 'Cele mai vizualizate' },
];
