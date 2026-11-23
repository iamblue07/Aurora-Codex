import { Sequelize } from 'sequelize';
import { genreLabel } from '../constants/genres.js';
import { Book, BookOffer, Listing } from '../models/index.js';
import { boxPlot, mean, normalDistributionCurve, round, standardDeviation } from '../utils/statistics.js';
import { toLikePattern } from '../utils/validation.js';

const { fn, col } = Sequelize;

const genreRef = (code) => ({ code, label: genreLabel(code) });
const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

export const getListingStatistics = async () => {
    const [total, available, closed, byPrice, byGenre, prices] = await Promise.all([
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
    const [topAuthors, genres] = await Promise.all([
        getAuthorStatistics({ limit: 10 }),
        getGenrePriceStatistics(shares),
    ]);

    return {
        totalBooks,
        topGenre: topGenre ? { ...genreRef(topGenre), percentOfTotal: shares.get(topGenre).percentOfTotal } : null,
        topAuthors,
        genres,
    };
};
