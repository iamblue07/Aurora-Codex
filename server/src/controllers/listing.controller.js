import { toStoredPath, UPLOAD_FOLDERS } from '../config/paths.js';
import { LISTING_SORTS } from '../constants/domain.js';
import { GENRE_CODES } from '../constants/genres.js';
import { serializeChat, serializeListing, serializeListingSummary } from '../serializers/index.js';
import * as chatService from '../services/chat.service.js';
import * as listingService from '../services/listing.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import { sendStoredFile } from '../utils/files.js';
import HttpError from '../utils/http-error.js';
import {
    optionalString,
    parseBoolean,
    parseEnum,
    parseId,
    parseNumber,
    parseOptionalBoolean,
    parseOptionalEnum,
    parseOptionalId,
    parseOptionalNumber,
    parsePagination,
    requireString,
} from '../utils/validation.js';

const MAX_PRICE = 1_000_000;

const listingIdParam = (req) => parseId(req.params.listingId, 'listingId');
const parsePrice = (value) => Math.round(parseNumber(value, 'price', { min: 0, max: MAX_PRICE }) * 100) / 100;

export default wrapController({
    async search(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit, { defaultLimit: 12 });
        const { listings, total } = await listingService.searchListings({
            ...pagination,
            search: optionalString(req.query.search, 'search', { maxLength: 255 }),
            genre: parseOptionalEnum(req.query.genre, 'genre', GENRE_CODES),
            minPrice: parseOptionalNumber(req.query.minPrice, 'minPrice', { min: 0 }),
            maxPrice: parseOptionalNumber(req.query.maxPrice, 'maxPrice', { min: 0 }),
            sort: parseOptionalEnum(req.query.sort, 'sort', LISTING_SORTS, 'newest'),
        });
        res.json(paginated(listings.map(serializeListingSummary), { ...pagination, total }));
    },

    /** POST /api/listings (multipart/form-data with an `image` file). */
    async create(req, res) {
        if (!req.file) throw HttpError.badRequest('Listing image is required');
        const body = req.body ?? {};
        const listing = await listingService.createListing(req.user.id, {
            title: requireString(body.title, 'title', { maxLength: 255 }),
            description: requireString(body.description, 'description', { maxLength: 5000 }),
            price: parsePrice(body.price),
            genre: parseEnum(body.genre, 'genre', GENRE_CODES),
            isNegotiable: parseOptionalBoolean(body.isNegotiable, 'isNegotiable', false),
            bookId: parseOptionalId(body.bookId, 'bookId'),
            imagePath: toStoredPath(UPLOAD_FOLDERS.images, req.file.filename),
        });
        res.status(201).json(serializeListing(listing, req.user.id));
    },

    /** GET /api/listings/:listingId — `isOwner` is filled in when the request is authenticated. */
    async getListing(req, res) {
        res.json(serializeListing(await listingService.getListing(listingIdParam(req)), req.user?.id));
    },

    async getImage(req, res) {
        const listing = await listingService.findListingOrThrow(listingIdParam(req), { attributes: ['imagePath'] });
        await sendStoredFile(res, listing.imagePath, 'Listing has no image');
    },

    async update(req, res) {
        const body = req.body ?? {};
        const changes = {};
        if (body.price !== undefined) changes.price = parsePrice(body.price);
        if (body.isNegotiable !== undefined) changes.isNegotiable = parseBoolean(body.isNegotiable, 'isNegotiable');
        if (Object.keys(changes).length === 0) throw HttpError.badRequest('Nothing to update (allowed: price, isNegotiable)');

        const listing = await listingService.updateListing(req.user.id, listingIdParam(req), changes);
        res.json(serializeListing(listing, req.user.id));
    },

    async close(req, res) {
        res.json(serializeListing(await listingService.closeListing(req.user.id, listingIdParam(req)), req.user.id));
    },

    async remove(req, res) {
        await listingService.deleteOwnListing(req.user.id, listingIdParam(req));
        res.status(204).end();
    },

    /** GET /api/listings/:listingId/chat — the current user's conversation about this listing. */
    async getMyChat(req, res) {
        const chat = await chatService.findChatForListing(req.user.id, listingIdParam(req));
        res.json({ chat: chat ? serializeChat(chat, req.user.id) : null });
    },

    /** POST /api/listings/:listingId/chats — contact the seller. */
    async startChat(req, res) {
        const message = requireString(req.body?.message, 'message', { maxLength: 2000 });
        const chat = await chatService.startChat(req.user.id, listingIdParam(req), message);
        res.status(201).json(serializeChat(chat, req.user.id));
    },
});
