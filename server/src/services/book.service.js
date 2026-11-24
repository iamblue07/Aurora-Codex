import { Op, QueryTypes, Sequelize } from 'sequelize';
import { Book, BookOffer, ReadBook, sequelize } from '../models/index.js';
import { orderByIds } from '../utils/collections.js';
import HttpError from '../utils/http-error.js';
import { toLikePattern } from '../utils/validation.js';

/** ORDER BY fragments for the catalogue search, keyed by the API sort value (allow-list). */
const BOOK_ORDER_SQL = Object.freeze({
    price_asc: 'cheapest.min_price ASC',
    price_desc: 'cheapest.min_price DESC',
    title_asc: 'b.title ASC',
    title_desc: 'b.title DESC',
});

const RANDOM_BOOKS_COUNT = 20;

export const findBookOrThrow = async (bookId, options) => {
    const book = await Book.findByPk(bookId, options);
    if (!book) throw HttpError.notFound('Book not found');
    return book;
};

/** Book cards with their lowest offer price, in the same order as `ids`. */
export const getBookSummaries = async (ids) => {
    if (ids.length === 0) return [];
    const books = await Book.findAll({
        where: { id: ids },
        attributes: [
            'id', 'title', 'author', 'isbn', 'genre', 'coverImage',
            [Sequelize.fn('MIN', Sequelize.col('offers.price')), 'lowestPrice'],
        ],
        include: [{ model: BookOffer, as: 'offers', attributes: [] }],
        group: ['Book.id'],
    });
    return orderByIds(books, ids);
};

/**
 * Paginated catalogue search. A book matches when its title contains `search`, its genre is one of
 * `genres` (if given) and its cheapest offer lies within [minPrice, maxPrice] (if given).
 */
export const searchBooks = async ({ search, genres, minPrice, maxPrice, sort, limit, offset }) => {
    const conditions = ['b.title LIKE :titlePattern'];
    if (genres.length) conditions.push('b.genre IN (:genres)');
    if (minPrice !== null) conditions.push('cheapest.min_price >= :minPrice');
    if (maxPrice !== null) conditions.push('cheapest.min_price <= :maxPrice');

    const fromClause = `
        FROM books AS b
        JOIN (
            SELECT book_id, MIN(price) AS min_price FROM book_offers GROUP BY book_id
        ) AS cheapest ON cheapest.book_id = b.id
        WHERE ${conditions.join(' AND ')}`;

    const replacements = { titlePattern: toLikePattern(search), genres, minPrice, maxPrice, limit, offset };
    const orderClause = `ORDER BY ${BOOK_ORDER_SQL[sort] ? `${BOOK_ORDER_SQL[sort]}, ` : ''}b.id ASC`;

    const [rows, [{ total }]] = await Promise.all([
        sequelize.query(`SELECT b.id ${fromClause} ${orderClause} LIMIT :limit OFFSET :offset`, {
            replacements, type: QueryTypes.SELECT,
        }),
        sequelize.query(`SELECT COUNT(*) AS total ${fromClause}`, { replacements, type: QueryTypes.SELECT }),
    ]);

    return { books: await getBookSummaries(rows.map((row) => row.id)), total: Number(total) };
};

/** Short title lookup, e.g. to link a marketplace listing to a catalogue book. */
export const lookupBooks = async ({ query, limit, offset }) => {
    const { rows, count } = await Book.findAndCountAll({
        where: { title: { [Op.like]: toLikePattern(query) } },
        attributes: ['id', 'title', 'author', 'genre', 'isbn', 'coverImage'],
        order: [['title', 'ASC'], ['id', 'ASC']],
        limit,
        offset,
    });
    return { books: rows, total: count };
};

/**
 * Random books without `ORDER BY RAND()` (which sorts the whole table on every call): pick
 * random ids in the id range, oversampled to cover gaps left by deleted books.
 */
export const getRandomBooks = async (count = RANDOM_BOOKS_COUNT) => {
    const [range] = await Book.findAll({
        attributes: [[Sequelize.fn('MIN', Sequelize.col('id')), 'minId'], [Sequelize.fn('MAX', Sequelize.col('id')), 'maxId']],
        raw: true,
    });
    if (!range?.maxId) return [];
    const span = range.maxId - range.minId + 1;
    const candidates = new Set();
    while (candidates.size < Math.min(span, count * 3)) {
        candidates.add(range.minId + Math.floor(Math.random() * span));
    }
    const found = await Book.findAll({ attributes: ['id'], where: { id: [...candidates] }, raw: true });
    const ids = found.map((book) => book.id).sort(() => Math.random() - 0.5).slice(0, count);
    return getBookSummaries(ids);
};

export const getBook = (bookId) => findBookOrThrow(bookId);

/**
 * Where the cover lives: scraped books store a remote URL, others a stored upload path.
 * @returns {Promise<{ kind: 'remote', url: URL } | { kind: 'local', path: string }>}
 */
export const getCoverSource = async (bookId) => {
    const { coverImage } = await findBookOrThrow(bookId, { attributes: ['coverImage'] });
    if (!coverImage) throw HttpError.notFound('Book has no cover image');
    try {
        const url = new URL(coverImage);
        if (url.protocol === 'http:' || url.protocol === 'https:') return { kind: 'remote', url };
    } catch {
        // Not a URL: it is a path inside the uploads folder.
    }
    return { kind: 'local', path: coverImage };
};

export const getOffers = async (bookId) => {
    await findBookOrThrow(bookId, { attributes: ['id'] });
    return BookOffer.findAll({ where: { bookId }, order: [['price', 'ASC']] });
};

// --- Reading history -----------------------------------------------------------------------

export const getRating = (userId, bookId) =>
    ReadBook.findOne({ where: { userId, bookId }, attributes: ['rating'] });

/** Marks a book as read with the given rating, or updates the rating if it was already read. */
export const rateBook = async (userId, bookId, rating) => {
    await findBookOrThrow(bookId, { attributes: ['id'] });
    const [entry, created] = await ReadBook.findOrCreate({
        where: { userId, bookId },
        defaults: { rating },
    });
    if (!created && entry.rating !== rating) {
        entry.rating = rating;
        await entry.save();
    }
    return entry;
};

export const removeRating = async (userId, bookId) => {
    const deleted = await ReadBook.destroy({ where: { userId, bookId } });
    if (deleted === 0) throw HttpError.notFound('Book is not marked as read');
};

export const getReadingHistory = (userId) => ReadBook.findAll({
    where: { userId },
    attributes: ['id', 'rating'],
    include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'author', 'coverImage'], required: true }],
    order: [['id', 'DESC']],
});

