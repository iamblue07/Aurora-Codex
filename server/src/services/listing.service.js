import { Op } from 'sequelize';
import { PERMISSIONS } from '../constants/domain.js';
import { Book, Chat, ChatMessage, Listing, User, USER_SUMMARY_ATTRIBUTES } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { removeStoredFile } from '../utils/files.js';
import { toLikePattern } from '../utils/validation.js';
import { findUserWithPermission } from './user.service.js';

const LISTING_ORDER = Object.freeze({
    newest: [['createdAt', 'DESC']],
    oldest: [['createdAt', 'ASC']],
    price_asc: [['price', 'ASC']],
    price_desc: [['price', 'DESC']],
});

const withSeller = { model: User, as: 'seller', attributes: [...USER_SUMMARY_ATTRIBUTES] };

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

/** Paginated search over available listings. */
export const searchListings = async ({ search, genre, minPrice, maxPrice, sort, limit, offset }) => {
    const where = { isAvailable: true };
    if (search) where.title = { [Op.like]: toLikePattern(search) };
    if (genre) where.genre = genre;
    if (minPrice !== null || maxPrice !== null) {
        where.price = {
            ...(minPrice !== null && { [Op.gte]: minPrice }),
            ...(maxPrice !== null && { [Op.lte]: maxPrice }),
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

export const getListing = (listingId) => findListingOrThrow(listingId, { include: [withSeller] });

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

export const createListing = async (userId, data) => {
    await findUserWithPermission(userId, PERMISSIONS.createListings, 'Your permission to create listings has been revoked');
    if (data.bookId !== null && !await Book.count({ where: { id: data.bookId } })) {
        throw HttpError.badRequest('The linked book does not exist');
    }
    const listing = await Listing.create({ ...data, sellerId: userId, isAvailable: true });
    return getListing(listing.id);
};

export const updateListing = async (userId, listingId, changes) => {
    const listing = await findOwnedListingOrThrow(userId, listingId);
    if (!listing.isAvailable) throw HttpError.badRequest('Closed listings can no longer be edited');
    await listing.update(changes);
    return getListing(listing.id);
};

/** Marks the listing as no longer available (sold / withdrawn). Irreversible by design. */
export const closeListing = async (userId, listingId) => {
    const listing = await findOwnedListingOrThrow(userId, listingId);
    if (listing.isAvailable) await listing.update({ isAvailable: false });
    return getListing(listing.id);
};

/**
 * Deletes a listing. Its chats and messages go with it (ON DELETE CASCADE); the uploaded files
 * are collected first and removed from disk once the row is gone.
 */
export const removeListing = async (listing) => {
    const media = await ChatMessage.findAll({
        attributes: ['mediaPath'],
        where: { mediaPath: { [Op.ne]: null } },
        include: [{ model: Chat, as: 'chat', attributes: [], where: { listingId: listing.id } }],
    });
    await listing.destroy();
    await Promise.all([listing.imagePath, ...media.map((m) => m.mediaPath)].filter(Boolean).map(removeStoredFile));
};

export const deleteOwnListing = async (userId, listingId) => {
    await removeListing(await findOwnedListingOrThrow(userId, listingId));
};
