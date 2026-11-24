import { toStoredPath, UPLOAD_FOLDERS } from '../config/paths.js';
import { EMOTIONS } from '../constants/domain.js';
import {
    serializeAccount,
    serializeBookSummary,
    serializeChat,
    serializeForum,
    serializeListingSummary,
    serializeReadBook,
} from '../serializers/index.js';
import * as bookService from '../services/book.service.js';
import * as chatService from '../services/chat.service.js';
import * as favoriteGenreService from '../services/favorite-genre.service.js';
import * as forumService from '../services/forum.service.js';
import * as listingService from '../services/listing.service.js';
import * as recommendationService from '../services/recommendation.service.js';
import * as userService from '../services/user.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import { genreLabel } from '../constants/genres.js';
import HttpError from '../utils/http-error.js';
import { optionalString, parseOptionalEnum, parsePagination } from '../utils/validation.js';
import { parseExistingPassword, parseNewPassword } from '../validators/account.validators.js';

const genreRefs = (codes) => codes.map((code) => ({ code, label: genreLabel(code) }));

/** Endpoints about the authenticated user ("me"). `req.user.id` is set by `authenticate`. */
export default wrapController({
    async getAccount(req, res) {
        res.json(serializeAccount(await userService.findUserOrThrow(req.user.id)));
    },

    async updateAccount(req, res) {
        const description = optionalString(req.body?.description, 'description', { maxLength: 2000 });
        res.json(serializeAccount(await userService.updateProfile(req.user.id, { description })));
    },

    async changePassword(req, res) {
        await userService.changePassword(req.user.id, {
            currentPassword: parseExistingPassword(req.body?.currentPassword, 'currentPassword'),
            newPassword: parseNewPassword(req.body?.newPassword),
        });
        res.status(204).end();
    },

    async uploadAvatar(req, res) {
        if (!req.file) throw HttpError.badRequest('No file uploaded');
        const avatarPath = toStoredPath(UPLOAD_FOLDERS.images, req.file.filename);
        const user = await userService.updateAvatar(req.user.id, avatarPath);
        res.json(serializeAccount(user));
    },

    async getFavoriteGenres(req, res) {
        res.json({ genres: genreRefs(await favoriteGenreService.getFavoriteGenres(req.user.id)) });
    },

    async setFavoriteGenres(req, res) {
        const genres = await favoriteGenreService.setFavoriteGenres(req.user.id, req.body?.genres);
        res.json({ genres: genreRefs(genres) });
    },

    async getReadingHistory(req, res) {
        res.json((await bookService.getReadingHistory(req.user.id)).map(serializeReadBook));
    },

    async getRecommendations(req, res) {
        res.json((await bookService.getRecommendedBooks(req.user.id)).map(serializeBookSummary));
    },

    /**
     * Regenerates the user's recommendations. With a `query` (keywords + optional emotional tone)
     * the books closest in meaning to it are recommended; without one, the reader's ratings and
     * favourite genres are used.
     */
    async generateRecommendations(req, res) {
        const query = optionalString(req.body?.query, 'query', { maxLength: 500 });

        if (query) {
            const sentiment = parseOptionalEnum(req.body?.sentiment, 'sentiment', EMOTIONS, null);
            await recommendationService.recommendFromQuery(req.user.id, { query, sentiment });
        } else {
            await recommendationService.recommendFromProfile(req.user.id);
        }
        res.json((await bookService.getRecommendedBooks(req.user.id)).map(serializeBookSummary));
    },

    async getListings(req, res) {
        const listings = await listingService.getListingsBySeller(req.user.id);
        res.json(listings.map((listing) => serializeListingSummary(listing)));
    },

    /** GET /api/me/favorite-listings — saved listings, most recently saved first. */
    async getFavoriteListings(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit, { defaultLimit: 24, maxLimit: 48 });
        const { listings, total } = await listingService.listFavorites(req.user.id, pagination);
        const items = listings.map((listing) => serializeListingSummary(listing, { isFavorite: true }));
        res.json(paginated(items, { ...pagination, total }));
    },

    async getForums(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit);
        const { forums, total } = await forumService.listForums({
            ...pagination,
            search: optionalString(req.query.search, 'search', { maxLength: 255 }),
            authorId: req.user.id,
        });
        res.json(paginated(forums.map(serializeForum), { ...pagination, total }));
    },

    async getChats(req, res) {
        const chats = await chatService.getChatsForUser(req.user.id);
        res.json(chats.map((chat) => serializeChat(chat, req.user.id)));
    },
});
