import { QueryTypes, Sequelize } from 'sequelize';
import { genreLabel } from '../constants/genres.js';
import { LISTING_CONDITIONS } from '../constants/domain.js';
import { Book, BookOffer, Listing, sequelize } from '../models/index.js';
import { boxPlot, mean, normalDistributionCurve, round, standardDeviation } from '../utils/statistics.js';
import { toLikePattern } from '../utils/validation.js';

const { fn, col } = Sequelize;

const genreRef = (code) => ({ code, label: genreLabel(code) });
const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const select = (sql) => sequelize.query(sql, { type: QueryTypes.SELECT });

/** Condition, place and delivery of the listings on offer, plus reservations and favourites. */
const getListingDetails = async () => {
    const [[totals], conditions, cities] = await Promise.all([
        select(`SELECT
                COALESCE(SUM(is_available = 1 AND is_reserved = 1), 0) AS reserved,
                COALESCE(SUM(is_available = 1 AND offers_shipping = 1), 0) AS shipping,
                COALESCE(SUM(favorite_count), 0) AS favorites
            FROM listings`),
        select(`SELECT book_condition AS bookCondition, COUNT(*) AS count
            FROM listings WHERE is_available = 1 GROUP BY book_condition`),
        select(`SELECT city, COUNT(*) AS count FROM listings
            WHERE is_available = 1 AND city IS NOT NULL GROUP BY city ORDER BY count DESC, city LIMIT 8`),
    ]);
    const byCondition = new Map(conditions.map((row) => [row.bookCondition, Number(row.count)]));
    return {
        reservedListings: Number(totals.reserved),
        shippingListings: Number(totals.shipping),
        totalFavorites: Number(totals.favorites),
        // Every condition, best first, so the chart keeps a stable order.
        conditions: LISTING_CONDITIONS.map((condition) => ({ condition, count: byCondition.get(condition) ?? 0 })),
        cities: cities.map((row) => ({ city: row.city, count: Number(row.count) })),
    };
};

export const getListingStatistics = async () => {
    const [total, available, closed, byPrice, byGenre, prices, details] = await Promise.all([
        Listing.count(),
        Listing.count({ where: { isAvailable: true } }),
        Listing.count({ where: { isAvailable: false } }),
        Listing.findAll({
            attributes: ['price', [fn('COUNT', col('id')), 'count']],
            group: ['price'],
            order: [['price', 'ASC']],
            raw: true,
        }),
        Listing.findAll({
            attributes: ['genre', [fn('COUNT', col('id')), 'count'], [fn('AVG', col('price')), 'averagePrice']],
            group: ['genre'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            raw: true,
        }),
        Listing.findAll({ attributes: ['price'], order: [['price', 'ASC']], raw: true }),
        getListingDetails(),
    ]);

    return {
        totalListings: total,
        availableListings: available,
        closedListings: closed,
        priceDistribution: byPrice.map((row) => ({ price: Number(row.price), count: Number(row.count) })),
        genres: byGenre.map((row) => ({
            genre: genreRef(row.genre),
            count: Number(row.count),
            averagePrice: round(Number(row.averagePrice)),
        })),
        priceBoxPlot: boxPlot(prices.map((row) => Number(row.price))),
        ...details,
    };
};

/** Book count and share of the catalogue per genre, plus the most common genre. */
const getGenreShares = async (totalBooks) => {
    const rows = await Book.findAll({
        attributes: ['genre', [fn('COUNT', col('id')), 'count']],
        group: ['genre'],
        raw: true,
    });

    const shares = new Map(rows.map(({ genre, count }) => [genre, {
        count: Number(count),
        percentOfTotal: totalBooks ? round((Number(count) / totalBooks) * 100) : 0,
    }]));
    const [topGenre] = [...shares.entries()].sort(([, a], [, b]) => b.count - a.count)[0] ?? [null];
    return { shares, topGenre };
};

/**
 * Price and genre statistics per author, most prolific first. Filtered and limited on the
 * database side: the catalogue has tens of thousands of authors, far too many to ship at once.
 */
export const getAuthorStatistics = async ({ search = '', limit = 10 } = {}) => {
    const authorFilter = {
        author: search ? { [Sequelize.Op.like]: toLikePattern(search) } : { [Sequelize.Op.ne]: null },
    };
    const priceRows = await Book.findAll({
        attributes: [
            'author',
            [fn('MIN', col('offers.price')), 'minPrice'],
            [fn('MAX', col('offers.price')), 'maxPrice'],
            [fn('AVG', col('offers.price')), 'averagePrice'],
            [fn('COUNT', fn('DISTINCT', col('Book.id'))), 'books'],
        ],
        where: authorFilter,
        include: [{ model: BookOffer, as: 'offers', attributes: [] }],
        group: ['author'],
        order: [[fn('COUNT', fn('DISTINCT', col('Book.id'))), 'DESC'], ['author', 'ASC']],
        limit,
        subQuery: false,
        raw: true,
    });
    const authors = priceRows.map((row) => row.author);
    const genreRows = authors.length
        ? await Book.findAll({
            attributes: ['author', 'genre', [fn('COUNT', col('id')), 'count']],
            where: { author: authors },
            group: ['author', 'genre'],
            raw: true,
        })
        : [];

    // Index genre counts by author once instead of filtering the whole list for every author.
    const genresByAuthor = new Map();
    for (const { author, genre, count } of genreRows) {
        if (!genresByAuthor.has(author)) genresByAuthor.set(author, []);
        genresByAuthor.get(author).push({ genre: genreRef(genre), count: Number(count) });
    }

    return priceRows.map((row) => ({
        author: row.author,
        books: Number(row.books),
        minPrice: toNumber(row.minPrice),
        maxPrice: toNumber(row.maxPrice),
        averagePrice: row.averagePrice === null ? null : round(Number(row.averagePrice)),
        genres: genresByAuthor.get(row.author) ?? [],
    }));
};

/** Price spread of the book offers in every genre, with a fitted normal distribution curve. */
const getGenrePriceStatistics = async (genreShares) => {
    const offers = await BookOffer.findAll({
        attributes: ['price', [col('book.genre'), 'genre']],
        include: [{ model: Book, as: 'book', attributes: [] }],
        where: { price: { [Sequelize.Op.gt]: 0 } },
        raw: true,
    });

    const pricesByGenre = new Map();
    for (const { price, genre } of offers) {
        if (!pricesByGenre.has(genre)) pricesByGenre.set(genre, []);
        pricesByGenre.get(genre).push(Number(price));
    }

    return [...pricesByGenre.entries()].map(([genre, prices]) => {
        prices.sort((a, b) => a - b);
        const average = mean(prices);
        const sd = standardDeviation(prices);
        const min = prices[0];
        const max = prices[prices.length - 1];
        // Plot mean ± 3σ (99.7% of a normal distribution) so a few outliers don't flatten the curve.
        const curveRange = { min: Math.max(min, average - 3 * sd), max: Math.min(max, average + 3 * sd) };
        return {
            genre: genreRef(genre),
            offers: prices.length,
            percentOfBooks: genreShares.get(genre)?.percentOfTotal ?? 0,
            minPrice: min,
            maxPrice: max,
            averagePrice: round(average),
            normalDistribution: normalDistributionCurve({ ...curveRange, avg: average, sd }),
        };
    });
};

export const getBookStatistics = async () => {
    const totalBooks = await Book.count();
    const { shares, topGenre } = await getGenreShares(totalBooks);
    const [topAuthors, genres, stores] = await Promise.all([
        getAuthorStatistics({ limit: 10 }),
        getGenrePriceStatistics(shares),
        select(`SELECT store, COUNT(*) AS offers, AVG(price) AS averagePrice
            FROM book_offers WHERE price > 0 GROUP BY store ORDER BY offers DESC`),
    ]);

    return {
        totalBooks,
        topGenre: topGenre ? { ...genreRef(topGenre), percentOfTotal: shares.get(topGenre).percentOfTotal } : null,
        topAuthors,
        genres,
        stores: stores.map((row) => ({
            store: row.store,
            offers: Number(row.offers),
            averagePrice: round(Number(row.averagePrice)),
        })),
    };
};

const MIN_RATINGS_FOR_TOP = 2;

/** Members, ratings, best-rated books, forum activity and favourite genres. */
export const getCommunityStatistics = async () => {
    const [[members], [ratings], ratingRows, topRated, [forum], categories, favoriteGenres] = await Promise.all([
        select(`SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= NOW() - INTERVAL 30 DAY), 0) AS recent
            FROM users`),
        select('SELECT COUNT(*) AS total, AVG(rating) AS average FROM read_books WHERE rating > 0'),
        select('SELECT rating, COUNT(*) AS count FROM read_books WHERE rating > 0 GROUP BY rating'),
        select(`SELECT b.id, b.title, b.author, b.cover_image AS coverImage,
                AVG(r.rating) AS average, COUNT(*) AS ratings
            FROM read_books r JOIN books b ON b.id = r.book_id
            WHERE r.rating > 0
            GROUP BY b.id HAVING COUNT(*) >= ${MIN_RATINGS_FOR_TOP}
            ORDER BY average DESC, ratings DESC, b.id LIMIT 6`),
        select(`SELECT (SELECT COUNT(*) FROM forums) AS threads, (SELECT COUNT(*) FROM forum_messages) AS posts,
                (SELECT COUNT(DISTINCT author_id) FROM forum_messages) AS posters`),
        select(`SELECT c.name, COUNT(f.id) AS threads, COALESCE(SUM(f.message_count), 0) AS posts
            FROM forum_categories c LEFT JOIN forums f ON f.category_id = c.id
            GROUP BY c.id ORDER BY posts DESC, c.position`),
        select('SELECT genre, COUNT(*) AS count FROM favorite_genres GROUP BY genre ORDER BY count DESC, genre LIMIT 8'),
    ]);
    const byRating = new Map(ratingRows.map((row) => [Math.round(Number(row.rating)), Number(row.count)]));
    return {
        members: Number(members.total),
        newMembers: Number(members.recent),
        ratings: Number(ratings.total),
        averageRating: ratings.average === null ? null : round(Number(ratings.average)),
        ratingDistribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: byRating.get(stars) ?? 0 })),
        topRatedBooks: topRated.map((row) => ({
            id: row.id,
            title: row.title,
            author: row.author,
            coverImage: row.coverImage,
            averageRating: round(Number(row.average)),
            ratings: Number(row.ratings),
        })),
        forum: { threads: Number(forum.threads), posts: Number(forum.posts), posters: Number(forum.posters) },
        forumCategories: categories.map((row) => ({
            name: row.name,
            threads: Number(row.threads),
            posts: Number(row.posts),
        })),
        favoriteGenres: favoriteGenres.map((row) => ({ genre: genreRef(row.genre), count: Number(row.count) })),
    };
};
