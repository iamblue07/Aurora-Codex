/**
 * Centralised TanStack Query keys, so invalidations always target the right cache entries.
 * Keys are hierarchical: invalidating ['listings'] also invalidates every listings query.
 */
export const queryKeys = {
    me: ['me'],
    genres: ['genres'],
    features: ['features'],
    favoriteGenres: ['me', 'favorite-genres'],
    readingHistory: ['me', 'reading-history'],
    recommendations: ['me', 'recommendations'],
    myListings: ['me', 'listings'],
    myFavoriteListings: (params) => ['me', 'favorite-listings', params],
    myForums: (params) => ['me', 'forums', params],
    myChats: ['me', 'chats'],

    books: {
        all: ['books'],
        search: (params) => ['books', 'search', params],
        lookup: (params) => ['books', 'lookup', params],
        random: ['books', 'random'],
        detail: (id) => ['books', id],
        offers: (id) => ['books', id, 'offers'],
        listings: (id) => ['books', id, 'listings'],
        similar: (id) => ['books', id, 'similar'],
        rating: (id) => ['books', id, 'rating'],
        externalInfo: (id) => ['books', id, 'external-info'],
    },
    listings: {
        all: ['listings'],
        search: (params) => ['listings', 'search', params],
        cities: ['listings', 'cities'],
        detail: (id) => ['listings', id],
        similar: (id) => ['listings', id, 'similar'],
        myChat: (id) => ['listings', id, 'chat'],
    },
    chats: {
        detail: (id) => ['chats', id],
        messages: (id) => ['chats', id, 'messages'],
    },
    forums: {
        all: ['forums'],
        board: ['forums', 'board'],
        list: (params) => ['forums', 'list', params],
        detail: (id) => ['forums', id],
        messages: (id, params) => ['forums', id, 'messages', params],
    },
    users: {
        profile: (id) => ['users', id],
        listings: (id) => ['users', id, 'listings'],
        forums: (id, params) => ['users', id, 'forums', params],
    },
    reports: {
        all: ['reports'],
        list: (params) => ['reports', 'list', params],
        detail: (id) => ['reports', id],
    },
    admin: {
        aiStatus: ['admin', 'ai'],
        settings: ['admin', 'settings'],
        jobs: ['admin', 'jobs'],
    },
    statistics: {
        listings: ['statistics', 'listings'],
        books: ['statistics', 'books'],
        community: ['statistics', 'community'],
    },
};
