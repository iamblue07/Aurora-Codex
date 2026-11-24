/** Domain-wide enumerations shared by models, services and validation. */

/** User permission flags that administrators can revoke. Keys are the values accepted by the API. */
export const PERMISSIONS = Object.freeze({
    createListings: 'canCreateListings',
    createForums: 'canCreateForums',
    sendMessages: 'canSendMessages',
    report: 'canReport',
});

/** Kinds of content users can report. */
export const REPORT_TARGETS = Object.freeze({
    CHAT_MESSAGE: 'chat_message',
    FORUM_MESSAGE: 'forum_message',
    FORUM: 'forum',
    LISTING: 'listing',
});

export const REPORT_TARGET_TYPES = Object.freeze(Object.values(REPORT_TARGETS));

/** Emotions scored for every book (`<emotion>_score` columns, 0–1), used to rank recommendations. */
export const EMOTIONS = Object.freeze(['anger', 'disgust', 'fear', 'joy', 'sadness', 'surprise', 'neutral']);

/** Model attribute holding the score of an emotion, e.g. `joyScore`. */
export const emotionAttribute = (emotion) => `${emotion}Score`;

export const RATING = Object.freeze({ MIN: 0, MAX: 5 });

export const MAX_FAVORITE_GENRES = 5;

export const BOOK_SORTS = Object.freeze(['price_asc', 'price_desc', 'title_asc', 'title_desc']);
export const LISTING_SORTS = Object.freeze(['newest', 'oldest', 'price_asc', 'price_desc', 'popular']);

/** Physical condition of a second-hand book, best first. */
export const LISTING_CONDITIONS = Object.freeze(['new', 'like_new', 'very_good', 'good', 'acceptable']);

export const MAX_LISTING_IMAGES = 6;

/** Background jobs administrators can start from the admin panel. */
export const JOB_TYPES = Object.freeze({
    SCRAPER: 'scraper',
    EMBEDDINGS: 'embeddings',
    EMOTIONS: 'emotions',
});

export const JOB_STATUSES = Object.freeze({
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    /** The server stopped while the job was running. */
    INTERRUPTED: 'interrupted',
});

/** Where a stored recommendation came from. */
export const RECOMMENDATION_SOURCES = Object.freeze({ QUERY: 'query', PROFILE: 'profile' });
