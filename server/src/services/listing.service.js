import { Op } from 'sequelize';
import { MAX_LISTING_IMAGES, PERMISSIONS } from '../constants/domain.js';
import {
    Book, BookOffer, Chat, ChatMessage, Listing, ListingFavorite, ListingImage, sequelize, User,
    USER_SUMMARY_ATTRIBUTES,
} from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { removeStoredFile } from '../utils/files.js';
import { toLikePattern } from '../utils/validation.js';
import { createViewCounter } from '../utils/view-counter.js';
import { findUserWithPermission } from './user.service.js';

const LISTING_ORDER = Object.freeze({
    newest: [['createdAt', 'DESC']],
    oldest: [['createdAt', 'ASC']],
    price_asc: [['price', 'ASC']],
    price_desc: [['price', 'DESC']],
    popular: [['favoriteCount', 'DESC'], ['viewCount', 'DESC']],
});

const withSeller = { model: User, as: 'seller', attributes: [...USER_SUMMARY_ATTRIBUTES] };
const withImages = { model: ListingImage, as: 'images', attributes: ['id', 'path', 'position'] };
const withBook = { model: Book, as: 'book', attributes: ['id', 'title', 'author', 'coverImage', 'genre'] };
const IMAGE_ORDER = [{ model: ListingImage, as: 'images' }, 'position', 'ASC'];

export const findListingOrThrow = async (listingId, options = {}) => {
    const listing = await Listing.findByPk(listingId, options);
    if (!listing) throw HttpError.notFound('Listing not found');
    return listing;
};

const findOwnedListingOrThrow = async (userId, listingId) => {
    const listing = await findListingOrThrow(listingId);
    if (listing.sellerId !== userId) throw HttpError.forbidden('You do not own this listing');
    return listing;
};

const assertOpen = (listing) => {
    if (!listing.isAvailable) throw HttpError.badRequest('Closed listings can no longer be edited');
};

/** Ids (of `listingIds`) the user saved, as a Set; empty for anonymous visitors. */
export const favoriteIdsFor = async (userId, listingIds) => {
    if (!userId || listingIds.length === 0) return new Set();
    const rows = await ListingFavorite.findAll({ attributes: ['listingId'], where: { userId, listingId: listingIds }, raw: true });
    return new Set(rows.map((row) => row.listingId));
};

/**
 * Paginated search over listings still on offer (reserved ones included).
 * `search` matches the title or the book author; `conditions` is a list of accepted conditions.
 */
export const searchListings = async ({
    search, genre, conditions, city, shipping, minPrice, maxPrice, sellerId, excludeSellerId, sort = 'newest', limit, offset,
}) => {
    const where = { isAvailable: true };
    if (search) {
        const pattern = toLikePattern(search);
        where[Op.or] = [{ title: { [Op.like]: pattern } }, { author: { [Op.like]: pattern } }];
    }
    if (genre) where.genre = genre;
    if (conditions?.length) where.condition = conditions;
    if (city) where.city = { [Op.like]: toLikePattern(city) };
    if (shipping) where.offersShipping = true;
    if (sellerId) where.sellerId = sellerId;
    if (excludeSellerId) where.sellerId = { [Op.ne]: excludeSellerId };
    if (minPrice !== null && minPrice !== undefined || maxPrice !== null && maxPrice !== undefined) {
        where.price = {
            ...(minPrice !== null && minPrice !== undefined && { [Op.gte]: minPrice }),
            ...(maxPrice !== null && maxPrice !== undefined && { [Op.lte]: maxPrice }),
        };
    }

    const { rows, count } = await Listing.findAndCountAll({
        where,
        include: [withSeller],
        order: [...LISTING_ORDER[sort], ['id', 'DESC']],
        limit,
        offset,
    });
    return { listings: rows, total: count };
};

/** Cities that currently have listings, most common first (for the location filter). */
export const listCities = async () => {
    const rows = await Listing.findAll({
        attributes: ['city', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { isAvailable: true, city: { [Op.ne]: null } },
        group: ['city'],
        order: [[sequelize.literal('count'), 'DESC'], ['city', 'ASC']],
        limit: 30,
        raw: true,
    });
    return rows.map((row) => ({ city: row.city, count: Number(row.count) }));
};

export const getListing = (listingId) => findListingOrThrow(listingId, {
    include: [withSeller, withImages, withBook],
    order: [IMAGE_ORDER],
});

/** Public seller facts shown next to a listing. */
export const getSellerStats = async (sellerId) => {
    const [seller, active, sold] = await Promise.all([
        User.findByPk(sellerId, { attributes: ['createdAt'] }),
        Listing.count({ where: { sellerId, isAvailable: true } }),
        Listing.count({ where: { sellerId, isAvailable: false } }),
    ]);
    return { memberSince: seller?.createdAt ?? null, activeListings: active, soldListings: sold };
};

/** Lowest bookstore price of the linked catalogue book, to compare the listing with. */
export const getStorePrice = async (bookId) => {
    if (!bookId) return null;
    const offer = await BookOffer.findOne({
        attributes: ['store', 'price'],
        where: { bookId, price: { [Op.gt]: 0 } },
        order: [['price', 'ASC']],
        raw: true,
    });
    return offer ? { store: offer.store, price: Number(offer.price) } : null;
};

/** Other listings a buyer of `listing` may like: the same book first, then the same genre. */
export const getSimilarListings = (listing, limit = 4) => {
    const sameBook = listing.bookId ? { bookId: listing.bookId } : null;
    return Listing.findAll({
        where: {
            isAvailable: true,
            id: { [Op.ne]: listing.id },
            sellerId: { [Op.ne]: listing.sellerId },
            [Op.or]: [sameBook, { genre: listing.genre }].filter(Boolean),
        },
        include: [withSeller],
        order: [
            ...(sameBook ? [[sequelize.literal(`book_id = ${Number(listing.bookId)}`), 'DESC']] : []),
            ['createdAt', 'DESC'],
        ],
        limit,
    });
};

export const getListingsBySeller = (sellerId) => Listing.findAll({
    where: { sellerId },
    include: [withSeller],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
});

export const getListingsForBook = (bookId) => Listing.findAll({
    where: { bookId, isAvailable: true },
    include: [withSeller],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
});

const assertBookExists = async (bookId) => {
    if (bookId !== null && bookId !== undefined && !await Book.count({ where: { id: bookId } })) {
        throw HttpError.badRequest('The linked book does not exist');
    }
};

const assertDelivery = ({ offersPickup, offersShipping }) => {
    if (!offersPickup && !offersShipping) throw HttpError.badRequest('Offer personal pickup, shipping or both');
};

/** Keeps `listings.image_path` equal to the first photo (lists only load the cover). */
const syncCover = async (listing, transaction) => {
    const first = await ListingImage.findOne({ where: { listingId: listing.id }, order: [['position', 'ASC'], ['id', 'ASC']], transaction });
    await listing.update({ imagePath: first?.path ?? null }, { transaction });
};

/** Creates a listing with its photos (`imagePaths`, already stored; the first is the cover). */
export const createListing = async (userId, data, imagePaths) => {
    try {
        await findUserWithPermission(userId, PERMISSIONS.createListings, 'Your permission to create listings has been revoked');
        await assertBookExists(data.bookId);
        assertDelivery(data);
        const id = await sequelize.transaction(async (transaction) => {
            const listing = await Listing.create(
                { ...data, sellerId: userId, isAvailable: true, imagePath: imagePaths[0] },
                { transaction },
            );
            await ListingImage.bulkCreate(
                imagePaths.map((path, position) => ({ listingId: listing.id, path, position })),
                { transaction },
            );
            return listing.id;
        });
        return getListing(id);
    } catch (error) {
        await Promise.all(imagePaths.map(removeStoredFile));
        throw error;
    }
};

export const updateListing = async (userId, listingId, changes) => {
    const listing = await findOwnedListingOrThrow(userId, listingId);
    assertOpen(listing);
    if (changes.bookId !== undefined) await assertBookExists(changes.bookId);
    assertDelivery({ ...listing.get(), ...changes });
    await listing.update(changes);
    return getListing(listing.id);
};

/** Adds photos to a listing, up to MAX_LISTING_IMAGES in total. */
export const addImages = async (userId, listingId, imagePaths) => {
    try {
        const listing = await findOwnedListingOrThrow(userId, listingId);
        assertOpen(listing);
        const existing = await ListingImage.findAll({ where: { listingId }, attributes: ['position'], raw: true });
        if (existing.length + imagePaths.length > MAX_LISTING_IMAGES) {
            throw HttpError.badRequest(`A listing can have at most ${MAX_LISTING_IMAGES} photos`);
        }
        const start = existing.reduce((max, image) => Math.max(max, image.position + 1), 0);
        await ListingImage.bulkCreate(imagePaths.map((path, index) => ({ listingId, path, position: start + index })));
        await syncCover(listing);
        return getListing(listingId);
    } catch (error) {
        await Promise.all(imagePaths.map(removeStoredFile));
        throw error;
    }
};

const findOwnImageOrThrow = async (userId, listingId, imageId) => {
    const listing = await findOwnedListingOrThrow(userId, listingId);
    assertOpen(listing);
    const image = await ListingImage.findOne({ where: { id: imageId, listingId } });
    if (!image) throw HttpError.notFound('Image not found');
    return { listing, image };
};

/** Removes one photo (a listing always keeps at least one). */
export const removeImage = async (userId, listingId, imageId) => {
    const { listing, image } = await findOwnImageOrThrow(userId, listingId, imageId);
    if (await ListingImage.count({ where: { listingId } }) <= 1) {
        throw HttpError.badRequest('A listing needs at least one photo');
    }
    await image.destroy();
    await syncCover(listing);
    await removeStoredFile(image.path);
    return getListing(listingId);
};

/** Makes a photo the cover: it moves first, the others keep their order. */
export const setCoverImage = async (userId, listingId, imageId) => {
    const { listing, image } = await findOwnImageOrThrow(userId, listingId, imageId);
    await sequelize.transaction(async (transaction) => {
        const images = await ListingImage.findAll({ where: { listingId }, order: [['position', 'ASC'], ['id', 'ASC']], transaction });
        const ordered = [image, ...images.filter((other) => other.id !== image.id)];
        for (const [position, item] of ordered.entries()) {
            if (item.position === position) continue;
            await ListingImage.update({ position }, { where: { id: item.id }, transaction });
        }
        await listing.update({ imagePath: image.path }, { transaction });
    });
    return getListing(listingId);
};

/** Marks the listing as no longer available (sold / withdrawn). Irreversible by design. */
export const closeListing = async (userId, listingId) => {
    const listing = await findOwnedListingOrThrow(userId, listingId);
    if (listing.isAvailable) await listing.update({ isAvailable: false, isReserved: false });
    return getListing(listing.id);
};

/**
 * Deletes a listing. Its photos, chats and messages go with it (ON DELETE CASCADE); the uploaded
 * files are collected first and removed from storage once the row is gone.
 */
export const removeListing = async (listing) => {
    const [media, images] = await Promise.all([
        ChatMessage.findAll({
            attributes: ['mediaPath'],
            where: { mediaPath: { [Op.ne]: null } },
            include: [{ model: Chat, as: 'chat', attributes: [], where: { listingId: listing.id } }],
        }),
        ListingImage.findAll({ attributes: ['path'], where: { listingId: listing.id }, raw: true }),
    ]);
    await listing.destroy();
    const files = new Set([listing.imagePath, ...images.map((image) => image.path), ...media.map((m) => m.mediaPath)]);
    await Promise.all([...files].filter(Boolean).map(removeStoredFile));
};

export const deleteOwnListing = async (userId, listingId) => {
    await removeListing(await findOwnedListingOrThrow(userId, listingId));
};

// --- Views and favourites ----------------------------------------------------------------------

const shouldCountView = createViewCounter();

/** Counts a visit (not the seller's own), at most once per visitor every 30 minutes. */
export const recordView = async (listing, viewerKey, viewerId) => {
    if (viewerId === listing.sellerId || !shouldCountView(`${listing.id}:${viewerKey}`)) return false;
    await Listing.increment('viewCount', { where: { id: listing.id }, silent: true });
    return true;
};

/** Saves or un-saves a listing for the user. */
export const setFavorite = async (userId, listingId, favorite) => {
    const listing = await findListingOrThrow(listingId, { attributes: ['id', 'sellerId'] });
    if (listing.sellerId === userId) throw HttpError.badRequest('You cannot save your own listing');

    if (favorite) await ListingFavorite.findOrCreate({ where: { listingId, userId } });
    else await ListingFavorite.destroy({ where: { listingId, userId } });
    const favoriteCount = await ListingFavorite.count({ where: { listingId } });
    await Listing.update({ favoriteCount }, { where: { id: listingId }, silent: true });
    return { favoriteCount, isFavorite: favorite };
};

/** The user's saved listings, most recently saved first (sold ones included, so they see what happened). */
export const listFavorites = async (userId, { limit, offset }) => {
    const { rows, count } = await ListingFavorite.findAndCountAll({
        where: { userId },
        include: [{ model: Listing, as: 'listing', required: true, include: [withSeller] }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });
    return { listings: rows.map((row) => row.listing), total: count };
};
