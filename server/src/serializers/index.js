/**
 * Serializers turn model instances into the JSON shapes exposed by the API.
 * Keeping them in one place guarantees consistent field names and that no internal column
 * (password hashes, raw file paths) ever leaks into a response.
 */
import { genreLabel } from '../constants/genres.js';
import { EMOTIONS, emotionAttribute, REPORT_TARGETS } from '../constants/domain.js';
import { publicImageUrl } from '../config/paths.js';

const genre = (code) => (code ? { code, label: genreLabel(code) } : null);

/** A user shown next to their content: name and avatar (load USER_SUMMARY_ATTRIBUTES). */
const authorRef = (user) => (user
    ? { id: user.id, username: user.username, avatarUrl: publicImageUrl(user.avatarPath) }
    : null);

// --- Users ---------------------------------------------------------------------------------

export const serializePermissions = (user) => ({
    canCreateListings: Boolean(user.canCreateListings),
    canCreateForums: Boolean(user.canCreateForums),
    canSendMessages: Boolean(user.canSendMessages),
    canReport: Boolean(user.canReport),
});

/** The authenticated user's own account. */
export const serializeAccount = (user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    description: user.description ?? '',
    avatarUrl: publicImageUrl(user.avatarPath),
    isAdmin: Boolean(user.isAdmin),
    permissions: serializePermissions(user),
    createdAt: user.createdAt,
});

/** What anyone can see about a user. */
export const serializePublicProfile = (user, favoriteGenres = []) => ({
    id: user.id,
    username: user.username,
    description: user.description ?? '',
    avatarUrl: publicImageUrl(user.avatarPath),
    isAdmin: Boolean(user.isAdmin),
    permissions: serializePermissions(user),
    favoriteGenres: favoriteGenres.map(genre),
    createdAt: user.createdAt,
});

// --- Books ---------------------------------------------------------------------------------

/** Public URL of a book cover: remote covers are proxied, local ones are served statically. */
export const coverUrl = (book) => {
    if (!book.coverImage) return null;
    return publicImageUrl(book.coverImage) ?? `/api/books/${book.id}/cover`;
};

export const serializeBookSummary = (book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: genre(book.genre),
    coverUrl: coverUrl(book),
    // Computed column added by the catalogue queries (absent in lookups).
    lowestPrice: book.get('lowestPrice') ?? null,
});

/** A stored recommendation: the book card, its 0–1 score and why it was picked. */
export const serializeRecommendation = ({ book, score, reason, reasonBook }) => ({
    book: serializeBookSummary(book),
    score: score ?? null,
    reason: reason ?? null,
    reasonBook: reasonBook ? { id: reasonBook.id, title: reasonBook.title } : null,
});

/** How the current recommendations were generated. */
export const serializeRecommendationRun = (run) => (run
    ? {
        source: run.source,
        query: run.query,
        sentiment: run.sentiment,
        basedOn: run.basedOn,
        seedCount: run.seedCount,
        personalized: Boolean(run.personalized),
        createdAt: run.createdAt,
    }
    : null);

export const serializeBook = (book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    description: book.description,
    englishDescription: book.englishDescription,
    genre: genre(book.genre),
    coverUrl: coverUrl(book),
    emotions: Object.fromEntries(EMOTIONS.map((emotion) => [emotion, book[emotionAttribute(emotion)] ?? null])),
});

export const serializeOffer = (offer) => ({
    id: offer.id,
    store: offer.store,
    url: offer.url,
    price: offer.price,
});

export const serializeReadBook = (entry) => ({
    id: entry.id,
    rating: entry.rating,
    book: { id: entry.book.id, title: entry.book.title, author: entry.book.author, coverUrl: coverUrl(entry.book) },
});

// --- Marketplace ---------------------------------------------------------------------------

/** A listing in a list (cards): the cover only. `extras.isFavorite` when the viewer is known. */
export const serializeListingSummary = (listing, { isFavorite = false } = {}) => ({
    id: listing.id,
    title: listing.title,
    author: listing.author ?? null,
    description: listing.description,
    price: listing.price,
    genre: genre(listing.genre),
    condition: listing.condition,
    city: listing.city ?? null,
    offersPickup: Boolean(listing.offersPickup),
    offersShipping: Boolean(listing.offersShipping),
    isNegotiable: listing.isNegotiable,
    isAvailable: listing.isAvailable,
    isReserved: Boolean(listing.isReserved),
    viewCount: listing.viewCount ?? 0,
    favoriteCount: listing.favoriteCount ?? 0,
    isFavorite,
    imageUrl: publicImageUrl(listing.imagePath),
    seller: authorRef(listing.seller),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt ?? null,
});

/**
 * A listing page: all photos, the linked catalogue book and, in `extras`, the viewer's favourite
 * flag, the seller's stats and the lowest bookstore price of the same book.
 */
export const serializeListing = (listing, currentUserId, extras = {}) => ({
    ...serializeListingSummary(listing, { isFavorite: extras.isFavorite ?? false }),
    bookId: listing.bookId,
    book: listing.book
        ? {
            id: listing.book.id,
            title: listing.book.title,
            author: listing.book.author,
            coverUrl: coverUrl(listing.book),
        }
        : null,
    images: (listing.images ?? []).map((image) => ({ id: image.id, url: publicImageUrl(image.path) })),
    isOwner: currentUserId !== undefined && currentUserId !== null && listing.sellerId === currentUserId,
    sellerStats: extras.sellerStats ?? null,
    storePrice: extras.storePrice ?? null,
});

// --- Chats ---------------------------------------------------------------------------------

const chatMediaUrl = (chatId, messageId) => `/api/chats/${chatId}/messages/${messageId}/media`;

export const serializeChat = (chat, currentUserId) => ({
    id: chat.id,
    isOpen: chat.isOpen,
    isSeller: chat.sellerId === currentUserId,
    listing: chat.listing
        ? { id: chat.listing.id, title: chat.listing.title, imageUrl: publicImageUrl(chat.listing.imagePath) }
        : null,
    seller: authorRef(chat.seller),
    buyer: authorRef(chat.buyer),
    createdAt: chat.createdAt,
});

export const serializeChatMessage = (message, currentUserId) => ({
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    isOwn: message.senderId === currentUserId,
    isMedia: message.isMedia,
    content: message.isMedia ? null : message.content,
    mediaUrl: message.isMedia ? chatMediaUrl(message.chatId, message.id) : null,
    createdAt: message.createdAt,
});

// --- Forums --------------------------------------------------------------------------------

export const serializeForumCategory = (category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    icon: category.icon,
});

/** A thread as listed and shown in its header. */
export const serializeForum = (forum) => ({
    id: forum.id,
    title: forum.title,
    isOpen: forum.isOpen,
    isPinned: forum.isPinned,
    category: forum.category ? serializeForumCategory(forum.category) : null,
    author: authorRef(forum.author),
    book: forum.book
        ? { id: forum.book.id, title: forum.book.title, author: forum.book.author, coverUrl: coverUrl(forum.book) }
        : null,
    postCount: forum.messageCount,
    replyCount: Math.max(0, forum.messageCount - 1),
    viewCount: forum.viewCount,
    lastPost: forum.lastMessageAt
        ? { at: forum.lastMessageAt, author: authorRef(forum.lastMessageAuthor) }
        : null,
    createdAt: forum.createdAt,
});

export const serializeForumCategorySummary = ({ category, threadCount, postCount, latestThread }) => ({
    ...serializeForumCategory(category),
    threadCount,
    postCount,
    latestThread: latestThread
        ? {
            id: latestThread.id,
            title: latestThread.title,
            lastPostAt: latestThread.lastMessageAt,
            lastPostAuthor: authorRef(latestThread.lastMessageAuthor),
        }
        : null,
});

const QUOTE_EXCERPT_LENGTH = 280;

/**
 * A post with its place in the thread. Removed posts keep their slot (numbering stays stable)
 * but expose no content. The second argument holds the per-page extras computed by the service.
 */
export const serializeForumMessage = (message, extras = {}) => {
    const { position = null, likeCount = 0, likedByViewer = false, authorPostCount = 0 } = extras;
    return serializeForumPost(message, { position, likeCount, likedByViewer, authorPostCount });
};

const serializeForumPost = (message, { position, likeCount, likedByViewer, authorPostCount }) => ({
    id: message.id,
    forumId: message.forumId,
    position,
    content: message.isRemoved ? null : message.content,
    isRemoved: message.isRemoved,
    editedAt: message.editedAt ?? null,
    author: message.author
        ? {
            ...authorRef(message.author),
            isAdmin: Boolean(message.author.isAdmin),
            joinedAt: message.author.createdAt,
            postCount: authorPostCount,
        }
        : null,
    replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            author: message.replyTo.author
                ? { id: message.replyTo.author.id, username: message.replyTo.author.username }
                : null,
            excerpt: message.replyTo.isRemoved ? null : message.replyTo.content.slice(0, QUOTE_EXCERPT_LENGTH),
        }
        : null,
    likeCount,
    likedByMe: likedByViewer,
    createdAt: message.createdAt,
});

// --- Reports -------------------------------------------------------------------------------

export const serializeReport = (report) => ({
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    isOpen: report.isOpen,
    reporter: authorRef(report.reporter),
    createdAt: report.createdAt,
});

/** The reported content as administrators see it (raw file paths replaced by URLs). */
const serializeReportTarget = (target, targetType) => {
    if (!target) return null;
    const { mediaPath, isMedia: _derived, ...fields } = target.toJSON();
    if (targetType === REPORT_TARGETS.CHAT_MESSAGE) {
        return { ...fields, mediaUrl: mediaPath ? chatMediaUrl(target.chatId, target.id) : null };
    }
    return fields;
};

export const serializeReportDetails = ({ report, target, targetAuthor }) => ({
    ...serializeReport(report),
    target: serializeReportTarget(target, report.targetType),
    targetAuthor: authorRef(targetAuthor),
});
