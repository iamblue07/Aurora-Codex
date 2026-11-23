import { BOOK_SORTS, RATING } from '../constants/domain.js';
import { isGenreCode } from '../constants/genres.js';
import {
    serializeBook,
    serializeBookSummary,
    serializeListingSummary,
    serializeOffer,
} from '../serializers/index.js';
import * as bookService from '../services/book.service.js';
import { getExternalInfo } from '../services/google-books.service.js';
import * as listingService from '../services/listing.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import { sendStoredFile } from '../utils/files.js';
import HttpError from '../utils/http-error.js';
import { proxyRemoteImage } from '../utils/remote-image.js';
import {
    optionalString,
    parseId,
    parseIdList,
    parseInteger,
    parseList,
    parseOptionalEnum,
    parseOptionalNumber,
    parsePagination,
} from '../utils/validation.js';

const bookIdParam = (req) => parseId(req.params.bookId, 'bookId');

const parseGenres = (value) => {
    const genres = parseList(value);
    const invalid = genres.filter((genre) => !isGenreCode(genre));
    if (invalid.length) throw HttpError.badRequest(`Unknown genres: ${invalid.join(', ')}`);
    return genres;
};

export default wrapController({
    /**
     * GET /api/books — catalogue search, or `?ids=1,2,3` to fetch specific books in that order.
     */
    async search(req, res) {
        if (req.query.ids !== undefined) {
            const ids = parseIdList(parseList(req.query.ids), { field: 'ids' });
            return res.json((await bookService.getBookSummaries(ids)).map(serializeBookSummary));
        }

        const pagination = parsePagination(req.query.page, req.query.limit, { defaultLimit: 20 });
        const { books, total } = await bookService.searchBooks({
            ...pagination,
            search: optionalString(req.query.search, 'search', { maxLength: 255 }),
            genres: parseGenres(req.query.genres),
            minPrice: parseOptionalNumber(req.query.minPrice, 'minPrice', { min: 0 }),
            maxPrice: parseOptionalNumber(req.query.maxPrice, 'maxPrice', { min: 0 }),
            sort: parseOptionalEnum(req.query.sort, 'sort', BOOK_SORTS),
        });
        return res.json(paginated(books.map(serializeBookSummary), { ...pagination, total }));
    },

    /** GET /api/books/lookup?query= — quick title search (e.g. when creating a listing). */
    async lookup(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit, { defaultLimit: 15 });
        const query = optionalString(req.query.query, 'query', { maxLength: 255 });
        if (!query) return res.json(paginated([], { ...pagination, total: 0 }));

        const { books, total } = await bookService.lookupBooks({ ...pagination, query });
        return res.json(paginated(books.map(serializeBookSummary), { ...pagination, total }));
    },

    async random(_req, res) {
        res.json((await bookService.getRandomBooks()).map(serializeBookSummary));
    },

    async getBook(req, res) {
        res.json(serializeBook(await bookService.getBook(bookIdParam(req))));
    },

    async getCover(req, res) {
        const source = await bookService.getCoverSource(bookIdParam(req));
        if (source.kind === 'remote') return proxyRemoteImage(res, source.url);
        return sendStoredFile(res, source.path, 'Image not found');
    },

    /** Publisher, year, pages… from Google Books (null when unknown). Cached by clients for a day. */
    async getExternalInfo(req, res) {
        res.set('Cache-Control', 'public, max-age=86400').json(await getExternalInfo(bookIdParam(req)));
    },

    async getOffers(req, res) {
        res.json((await bookService.getOffers(bookIdParam(req))).map(serializeOffer));
    },

    async getListings(req, res) {
        res.json((await listingService.getListingsForBook(bookIdParam(req))).map(serializeListingSummary));
    },

    /** GET /api/books/:bookId/rating — whether the current user read the book, and their rating. */
    async getRating(req, res) {
        const entry = await bookService.getRating(req.user.id, bookIdParam(req));
        res.json({ isRead: Boolean(entry), rating: entry?.rating ?? null });
    },

    async rate(req, res) {
        const rating = parseInteger(req.body?.rating, 'rating', { min: RATING.MIN, max: RATING.MAX });
        const entry = await bookService.rateBook(req.user.id, bookIdParam(req), rating);
        res.json({ isRead: true, rating: entry.rating });
    },

    async removeRating(req, res) {
        await bookService.removeRating(req.user.id, bookIdParam(req));
        res.status(204).end();
    },
});
