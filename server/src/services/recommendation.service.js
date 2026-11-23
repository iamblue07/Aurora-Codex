/**
 * Book recommendations, computed inside the API (formerly a separate Python service).
 *
 * 1. Candidates: the books semantically closest to a vector, found in the in-memory index of the
 *    book embeddings stored in MySQL. The vector is either the embedded search query, or the
 *    reader's "taste": the weighted average of the books they rated highly.
 * 2. Re-ranking: similarity blended with the requested emotion score and a small bonus for the
 *    reader's preferred genres (weights are admin settings).
 * 3. The result replaces the user's stored recommendations.
 */
import { EMOTIONS, emotionAttribute, RECOMMENDATION_SOURCES } from '../constants/domain.js';
import { genreLabel } from '../constants/genres.js';
import { Book, BookEmbedding, ReadBook, Recommendation, sequelize } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { buildQueryText } from './ai/book-text.js';
import { embed, isAiConfigured } from './ai/deepinfra.client.js';
import { searchSimilar } from './ai/vector-index.js';
import { fromBuffer, shorten, weightedCentroid } from './ai/vector-math.js';
import { getFavoriteGenres } from './favorite-genre.service.js';
import { getSettings } from './settings.service.js';

/** Fixed rules of the profile analysis (the tunable weights are admin settings). */
export const RECOMMENDATION_SETTINGS = Object.freeze({
    /** Multiplier applied to genres the user explicitly picked as favourites. */
    favoriteBoost: 1.2,
    /** Score given to a favourite genre the user hasn't rated yet (middle of the rating scale). */
    unratedFavoriteScore: 3,
    /** Only books rated at least this high shape the emotional tone. */
    highRatingThreshold: 4,
    topGenres: 3,
    /** Emotion used to rank profile recommendations when the history gives no signal (none). */
    defaultSentiment: null,
    /** Query used when a reader has no rated books with embeddings yet (Romanian catalogue). */
    queryPrefix: 'Literatura moderna',
});

const UNKNOWN_GENRE = null;

/**
 * Preferred genres, dominant emotion and a fallback text query from the user's favourite genres
 * and reading history. Pure function (no I/O) so the logic can be unit tested.
 *
 * @param {string[]} favoriteGenres genre codes the user picked
 * @param {{ rating: number, book: object }[]} readBooks rated books with their `book` row
 * @returns {{ query: string, sentiment: string|null, topGenres: string[] }}
 */
export const buildReadingProfile = (favoriteGenres, readBooks, settings = RECOMMENDATION_SETTINGS) => {
    // 1. Average rating per genre from the reading history.
    const totals = new Map();
    for (const { rating, book } of readBooks) {
        if (!book) continue;
        const genre = book.genre ?? UNKNOWN_GENRE;
        const entry = totals.get(genre) ?? { sum: 0, count: 0 };
        entry.sum += rating;
        entry.count += 1;
        totals.set(genre, entry);
    }
    const genreScores = new Map([...totals].map(([genre, { sum, count }]) => [genre, sum / count]));

    // 2. Boost favourite genres, including ones the user hasn't read anything from yet.
    for (const genre of new Set(favoriteGenres)) {
        const base = genreScores.get(genre) ?? settings.unratedFavoriteScore;
        genreScores.set(genre, base * settings.favoriteBoost);
    }

    const topGenres = [...genreScores.entries()]
        .filter(([genre]) => genre !== UNKNOWN_GENRE)
        .sort(([, a], [, b]) => b - a)
        .slice(0, settings.topGenres)
        .map(([genre]) => genre);

    // 3. Dominant emotion across the user's highly rated books.
    const emotionTotals = new Map(EMOTIONS.map((emotion) => [emotion, 0]));
    let hasEmotionData = false;
    for (const { rating, book } of readBooks) {
        if (!book || rating < settings.highRatingThreshold) continue;
        for (const emotion of EMOTIONS) {
            const score = book[emotionAttribute(emotion)];
            if (typeof score === 'number') {
                emotionTotals.set(emotion, emotionTotals.get(emotion) + score);
                hasEmotionData = true;
            }
        }
    }
    const sentiment = hasEmotionData
        ? [...emotionTotals.entries()].sort(([, a], [, b]) => b - a)[0][0]
        : settings.defaultSentiment;

    const query = topGenres.length
        ? `${settings.queryPrefix} despre ${topGenres.map(genreLabel).join(', ')}`
        : settings.queryPrefix;

    return { query, sentiment, topGenres };
};

/**
 * Orders candidates by a blend of meaning and mood. Pure function.
 *
 * - similarity is rescaled to 0–1 within the pool (raw cosine values sit in a narrow band);
 * - the emotion score (0–1) of the requested sentiment gets `emotionWeight`; books without a
 *   score get the pool average so they are neither favoured nor buried;
 * - books in `preferredGenres` get `genreBoost` added.
 *
 * @param {{ bookId: number, similarity: number }[]} candidates
 * @param {Map<number, object>} booksById rows with `genre` and the emotion score attributes
 * @returns {{ bookId: number, score: number }[]} best first
 */
export const rankCandidates = (candidates, booksById, {
    sentiment = null, emotionWeight = 0, preferredGenres = [], genreBoost = 0,
} = {}) => {
    if (candidates.length === 0) return [];
    const similarities = candidates.map((candidate) => candidate.similarity);
    const minSimilarity = Math.min(...similarities);
    const range = Math.max(...similarities) - minSimilarity || 1;

    const attribute = sentiment ? emotionAttribute(sentiment) : null;
    const emotionOf = (bookId) => {
        const value = attribute ? booksById.get(bookId)?.[attribute] : null;
        return typeof value === 'number' ? value : null;
    };
    const known = candidates.map(({ bookId }) => emotionOf(bookId)).filter((value) => value !== null);
    const averageEmotion = known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : 0;
    const weight = attribute ? emotionWeight : 0;
    const preferred = new Set(preferredGenres);

    return candidates
        .map(({ bookId, similarity }) => {
            const meaning = (similarity - minSimilarity) / range;
            const mood = emotionOf(bookId) ?? averageEmotion;
            const genreBonus = preferred.has(booksById.get(bookId)?.genre) ? genreBoost : 0;
            return { bookId, score: (1 - weight) * meaning + weight * mood + genreBonus };
        })
        .sort((a, b) => b.score - a.score);
};

/** Weight of a liked book in the taste vector: a 5 counts more than the minimum liked rating. */
export const tasteWeight = (rating, minTasteRating) => (rating >= minTasteRating ? rating - minTasteRating + 1 : 0);

const ensureAvailable = () => {
    if (!isAiConfigured()) throw HttpError.serviceUnavailable('Recommendations are disabled: no AI provider key is configured');
};

const embeddingSpace = (settings) => ({ model: settings['embeddings.model'], dimensions: settings['embeddings.dimensions'] });

/** Recently embedded queries: a repeated search costs neither time nor provider credits. */
const QUERY_CACHE_SIZE = 500;
const queryCache = new Map();

const embedQuery = async (text, settings) => {
    const input = buildQueryText(text, settings['embeddings.queryInstruction']);
    const key = `${settings['embeddings.model']}|${settings['embeddings.dimensions']}|${input.toLowerCase()}`;
    const cached = queryCache.get(key);
    if (cached) {
        queryCache.delete(key); // re-insert: the Map's order doubles as least-recently-used order
        queryCache.set(key, cached);
        return cached;
    }

    const { vectors } = await embed([input], { model: settings['embeddings.model'] });
    const vector = shorten(vectors[0], settings['embeddings.dimensions']);
    queryCache.set(key, vector);
    if (queryCache.size > QUERY_CACHE_SIZE) queryCache.delete(queryCache.keys().next().value);
    return vector;
};

/** Finds candidates near `vector`, re-ranks them and stores the top results for the user. */
const recommendNear = async (userId, vector, { settings, readBookIds, sentiment, preferredGenres, source }) => {
    const exclude = settings['recommendations.excludeRead'] ? readBookIds : new Set();
    const candidates = await searchSimilar(embeddingSpace(settings), vector, {
        limit: settings['recommendations.candidatePool'],
        exclude,
    });
    if (candidates.length === 0) {
        throw HttpError.serviceUnavailable('No book embeddings yet: an administrator must generate them first');
    }

    const books = await Book.findAll({
        where: { id: candidates.map((candidate) => candidate.bookId) },
        attributes: ['id', 'genre', ...EMOTIONS.map(emotionAttribute)],
        raw: true,
    });
    const ranked = rankCandidates(candidates, new Map(books.map((book) => [book.id, book])), {
        sentiment,
        emotionWeight: settings['recommendations.emotionWeight'],
        preferredGenres,
        genreBoost: settings['recommendations.genreBoost'],
    }).slice(0, settings['recommendations.resultCount']);

    await sequelize.transaction(async (transaction) => {
        await Recommendation.destroy({ where: { userId }, transaction });
        await Recommendation.bulkCreate(
            ranked.map(({ bookId, score }) => ({ userId, bookId, score, source })),
            { transaction },
        );
    });
    return ranked;
};

const readBooksOf = (userId) => ReadBook.findAll({
    where: { userId },
    attributes: ['rating', 'bookId'],
    include: [{ model: Book, as: 'book', attributes: ['genre', ...EMOTIONS.map(emotionAttribute)] }],
});

/** Recommendations for free-text keywords, optionally favouring an emotional tone. */
export const recommendFromQuery = async (userId, { query, sentiment = null }) => {
    ensureAvailable();
    const settings = await getSettings();
    const [vector, readBooks] = await Promise.all([embedQuery(query, settings), readBooksOf(userId)]);
    return recommendNear(userId, vector, {
        settings,
        readBookIds: new Set(readBooks.map((entry) => entry.bookId)),
        sentiment,
        preferredGenres: [],
        source: RECOMMENDATION_SOURCES.QUERY,
    });
};

/**
 * Recommendations from the reader's profile: the average embedding of the books they rated
 * highly (or, for new readers, a query built from their favourite genres), ranked towards the
 * emotion that dominates their favourite books.
 */
export const recommendFromProfile = async (userId) => {
    ensureAvailable();
    const settings = await getSettings();
    const [favoriteGenres, readBooks] = await Promise.all([getFavoriteGenres(userId), readBooksOf(userId)]);
    const profile = buildReadingProfile(favoriteGenres, readBooks);

    const minTasteRating = settings['recommendations.minTasteRating'];
    const liked = readBooks.filter((entry) => entry.rating >= minTasteRating);
    const space = embeddingSpace(settings);
    const embeddings = liked.length
        ? await BookEmbedding.findAll({
            where: { bookId: liked.map((entry) => entry.bookId), ...space },
            attributes: ['bookId', 'embedding'],
            raw: true,
        })
        : [];
    const ratingByBook = new Map(liked.map((entry) => [entry.bookId, entry.rating]));
    const taste = weightedCentroid(embeddings.map((row) => ({
        vector: fromBuffer(row.embedding),
        weight: tasteWeight(ratingByBook.get(row.bookId), minTasteRating),
    })));

    const vector = taste ?? await embedQuery(profile.query, settings);
    await recommendNear(userId, vector, {
        settings,
        readBookIds: new Set(readBooks.map((entry) => entry.bookId)),
        sentiment: profile.sentiment,
        preferredGenres: profile.topGenres,
        source: RECOMMENDATION_SOURCES.PROFILE,
    });
    return { ...profile, basedOn: taste ? 'ratings' : 'genres', likedBooks: embeddings.length };
};
