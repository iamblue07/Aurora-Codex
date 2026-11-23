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
const coverUrl = (book) => {
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

export const serializeListingSummary = (listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    genre: genre(listing.genre),
    isNegotiable: listing.isNegotiable,
    isAvailable: listing.isAvailable,
    imageUrl: publicImageUrl(listing.imagePath),
    seller: authorRef(listing.seller),
    createdAt: listing.createdAt,
});

export const serializeListing = (listing, currentUserId) => ({
    ...serializeListingSummary(listing),
    bookId: listing.bookId,
    isOwner: currentUserId !== undefined && listing.sellerId === currentUserId,
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

export const serializeForum = (forum) => ({
    id: forum.id,
    title: forum.title,
    isOpen: forum.isOpen,
    author: authorRef(forum.author),
    createdAt: forum.createdAt,
});

export const serializeForumMessage = (message) => ({
    id: message.id,
    forumId: message.forumId,
    content: message.isRemoved ? null : message.content,
    isRemoved: message.isRemoved,
    author: authorRef(message.author),
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
