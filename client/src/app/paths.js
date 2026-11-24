/**
 * Every route of the app in one place. URL slugs are user-facing, so they stay Romanian.
 * Use the helpers instead of building URLs by hand.
 */
export const paths = {
    home: '/',
    login: '/conecteaza-te',
    catalog: '/carti',
    book: (id = ':bookId') => `/carti/${id}`,
    marketplace: '/bazar',
    listing: (id = ':listingId') => `/bazar/anunt/${id}`,
    createListing: '/bazar/anunt-nou',
    editListing: (id = ':listingId') => `/bazar/anunt/${id}/editeaza`,
    myListings: '/bazar/anunturile-mele',
    chats: '/bazar/conversatii',
    chat: (id = ':chatId') => `/bazar/conversatii/${id}`,
    forums: '/forumuri',
    forum: (id = ':forumId') => `/forumuri/${id}`,
    /** `toate` lists the threads of every category. */
    forumCategory: (slug = ':slug') => `/forumuri/categorie/${slug}`,
    newThread: '/forumuri/discutie-noua',
    myForums: '/forumuri/ale-mele',
    profile: '/profil',
    readingHistory: '/profil/istoric',
    user: (id = ':userId') => `/utilizatori/${id}`,
    statistics: '/statistici',
    admin: '/admin',
    reports: '/admin/rapoarte',
};
