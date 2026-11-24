import { toStoredPath, UPLOAD_FOLDERS } from '../config/paths.js';
import { LISTING_CONDITIONS, LISTING_SORTS } from '../constants/domain.js';
import { GENRE_CODES } from '../constants/genres.js';
import { serializeChat, serializeListing, serializeListingSummary } from '../serializers/index.js';
import * as chatService from '../services/chat.service.js';
import * as listingService from '../services/listing.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import { removeStoredFile, sendStoredFile } from '../utils/files.js';
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
const parseTitle = (value) => requireString(value, 'title', { minLength: 3, maxLength: 255 });
const parseDescription = (value) => requireString(value, 'description', { minLength: 10, maxLength: 5000 });
const parseAuthor = (value) => optionalString(value, 'author', { maxLength: 255 }) || null;
const parseCity = (value) => optionalString(value, 'city', { maxLength: 80 }) || null;
const parseCondition = (value) => parseEnum(value, 'condition', LISTING_CONDITIONS);

/** `?condition=good,very_good` → ['good', 'very_good'] (each validated). */
const parseConditions = (value) => {
    const items = optionalString(value, 'condition', { maxLength: 100 }).split(',').map((item) => item.trim()).filter(Boolean);
    return items.map(parseCondition);
};

const storedImagePaths = (files = []) => files.map((file) => toStoredPath(UPLOAD_FOLDERS.images, file.filename));

/** Serializes listings for a list, with the viewer's favourite flags. */
const summaries = async (listings, viewerId) => {
    const favorites = await listingService.favoriteIdsFor(viewerId, listings.map((listing) => listing.id));
    return listings.map((listing) => serializeListingSummary(listing, { isFavorite: favorites.has(listing.id) }));
};

/** The full listing page payload for `viewerId` (may be undefined). */
const detail = async (listing, viewerId) => {
    const [favorites, sellerStats, storePrice] = await Promise.all([
        listingService.favoriteIdsFor(viewerId, [listing.id]),
        listingService.getSellerStats(listing.sellerId),
        listingService.getStorePrice(listing.bookId),
    ]);
    return serializeListing(listing, viewerId, { isFavorite: favorites.has(listing.id), sellerStats, storePrice });
};

export default wrapController({
    /** GET /api/listings?search&genre&condition=a,b&city&shipping&minPrice&maxPrice&seller&sort&page&limit */
    async search(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit, { defaultLimit: 12, maxLimit: 48 });
        const { listings, total } = await listingService.searchListings({
            ...pagination,
            search: optionalString(req.query.search, 'search', { maxLength: 255 }),
            genre: parseOptionalEnum(req.query.genre, 'genre', GENRE_CODES),
            conditions: parseConditions(req.query.condition),
            city: optionalString(req.query.city, 'city', { maxLength: 80 }),
            shipping: parseOptionalBoolean(req.query.shipping, 'shipping', false),
            minPrice: parseOptionalNumber(req.query.minPrice, 'minPrice', { min: 0 }),
            maxPrice: parseOptionalNumber(req.query.maxPrice, 'maxPrice', { min: 0 }),
            sellerId: parseOptionalId(req.query.seller, 'seller'),
            sort: parseOptionalEnum(req.query.sort, 'sort', LISTING_SORTS, 'newest'),
        });
        res.json(paginated(await summaries(listings, req.user?.id), { ...pagination, total }));
    },

    /** GET /api/listings/cities — cities with listings on offer, for the location filter. */
    async cities(_req, res) {
        res.json(await listingService.listCities());
    },

    /** POST /api/listings (multipart/form-data with 1–6 `images`). */
    async create(req, res) {
        const imagePaths = storedImagePaths(req.files);
        if (imagePaths.length === 0) throw HttpError.badRequest('At least one listing photo is required');
        let data;
        try {
            const body = req.body ?? {};
            data = {
                title: parseTitle(body.title),
                author: parseAuthor(body.author),
                description: parseDescription(body.description),
                price: parsePrice(body.price),
                genre: parseEnum(body.genre, 'genre', GENRE_CODES),
                condition: parseOptionalEnum(body.condition, 'condition', LISTING_CONDITIONS, 'good'),
                city: parseCity(body.city),
                offersPickup: parseOptionalBoolean(body.offersPickup, 'offersPickup', true),
                offersShipping: parseOptionalBoolean(body.offersShipping, 'offersShipping', false),
                isNegotiable: parseOptionalBoolean(body.isNegotiable, 'isNegotiable', false),
                bookId: parseOptionalId(body.bookId, 'bookId'),
            };
        } catch (error) {
            await Promise.all(imagePaths.map(removeStoredFile)); // invalid form: don't keep its photos
            throw error;
        }
        const listing = await listingService.createListing(req.user.id, data, imagePaths);
        res.status(201).json(await detail(listing, req.user.id));
    },

    /** GET /api/listings/:listingId — counts a view; `isOwner`/`isFavorite` need authentication. */
    async getListing(req, res) {
        const listing = await listingService.getListing(listingIdParam(req));
        const viewer = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
        if (await listingService.recordView(listing, viewer, req.user?.id)) listing.viewCount += 1;
        res.json(await detail(listing, req.user?.id));
    },

    /** GET /api/listings/:listingId/similar — same book first, then the same genre. */
    async similar(req, res) {
        const listing = await listingService.findListingOrThrow(listingIdParam(req));
        res.json(await summaries(await listingService.getSimilarListings(listing), req.user?.id));
    },

    async getImage(req, res) {
        const listing = await listingService.findListingOrThrow(listingIdParam(req), { attributes: ['imagePath'] });
        await sendStoredFile(res, listing.imagePath, 'Listing has no image');
    },

    /** PATCH /api/listings/:listingId — the seller edits any detail (or reserves / releases it). */
    async update(req, res) {
        const body = req.body ?? {};
        const parsers = {
            title: parseTitle,
            author: parseAuthor,
            description: parseDescription,
            price: parsePrice,
            genre: (value) => parseEnum(value, 'genre', GENRE_CODES),
            condition: parseCondition,
            city: parseCity,
            offersPickup: (value) => parseBoolean(value, 'offersPickup'),
            offersShipping: (value) => parseBoolean(value, 'offersShipping'),
            isNegotiable: (value) => parseBoolean(value, 'isNegotiable'),
            isReserved: (value) => parseBoolean(value, 'isReserved'),
            bookId: (value) => parseOptionalId(value, 'bookId'),
        };
        const changes = {};
        for (const [field, parse] of Object.entries(parsers)) {
            if (body[field] !== undefined) changes[field] = parse(body[field]);
        }
        if (Object.keys(changes).length === 0) {
            throw HttpError.badRequest(`Nothing to update (allowed: ${Object.keys(parsers).join(', ')})`);
        }
        const listing = await listingService.updateListing(req.user.id, listingIdParam(req), changes);
        res.json(await detail(listing, req.user.id));
    },

    /** POST /api/listings/:listingId/images (multipart, `images`) — adds photos. */
    async addImages(req, res) {
        const imagePaths = storedImagePaths(req.files);
        if (imagePaths.length === 0) throw HttpError.badRequest('No photos were sent');
        const listing = await listingService.addImages(req.user.id, listingIdParam(req), imagePaths);
        res.json(await detail(listing, req.user.id));
    },

    async removeImage(req, res) {
        const imageId = parseId(req.params.imageId, 'imageId');
        const listing = await listingService.removeImage(req.user.id, listingIdParam(req), imageId);
        res.json(await detail(listing, req.user.id));
    },

    /** PUT /api/listings/:listingId/images/:imageId/cover — makes that photo the cover. */
    async setCover(req, res) {
        const imageId = parseId(req.params.imageId, 'imageId');
        const listing = await listingService.setCoverImage(req.user.id, listingIdParam(req), imageId);
        res.json(await detail(listing, req.user.id));
    },

    async close(req, res) {
        const listing = await listingService.closeListing(req.user.id, listingIdParam(req));
        res.json(await detail(listing, req.user.id));
    },

    async remove(req, res) {
        await listingService.deleteOwnListing(req.user.id, listingIdParam(req));
        res.status(204).end();
    },

    async favorite(req, res) {
        res.json(await listingService.setFavorite(req.user.id, listingIdParam(req), true));
    },

    async unfavorite(req, res) {
        res.json(await listingService.setFavorite(req.user.id, listingIdParam(req), false));
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
