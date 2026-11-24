/**
 * Book recommendations, computed inside the API.
 *
 * 1. Candidates: the books semantically closest to the reader, found in the in-memory index of the
 *    book embeddings stored in MySQL. A profile run searches around the reader's overall taste (the
 *    weighted average of the books they liked) and around each of their favourite books separately,
 *    so a reader of both sci-fi and romance gets both instead of a blurred middle. A query run
 *    searches around the embedded request, optionally blended with the reader's taste.
 * 2. Feedback: books resembling ones the reader disliked (rated <= 2) or dismissed more than
 *    anything they liked are pushed down; dismissed and (optionally) read books are excluded.
 * 3. Re-ranking: similarity blended with the requested emotion and a small bonus for preferred
 *    genres, then reordered for variety (MMR) with a cap per author.
 * 4. Every result records why it was picked ("because you liked X", a genre, or the query); the
 *    list and how it was generated replace the user's stored recommendations.
 */
import { EMOTIONS, emotionAttribute, RECOMMENDATION_SOURCES } from '../constants/domain.js';
import { genreLabel } from '../constants/genres.js';
import {
    Book, ReadBook, Recommendation, RecommendationDismissal, RecommendationRun, sequelize,
} from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { buildQueryText } from './ai/book-text.js';
import { embed, isAiConfigured } from './ai/deepinfra.client.js';
import { getIndexStats, getVectors, searchSimilar } from './ai/vector-index.js';
import { closestSeed, diversify, dot, normalize, shorten, weightedCentroid } from './ai/vector-math.js';
import { getBookSummaries } from './book.service.js';
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


/** Ratings at or below this count as "disliked". */
export const DISLIKE_MAX_RATING = 2;

const RECOMMENDATION_REASONS = Object.freeze({ LIKED: 'liked', GENRE: 'genre', QUERY: 'query' });

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

/** Lower-cased author without diacritics, so "Mircea Eliade" and "MIRCEA ELIADE" group together. */
const authorKey = (author) => (author
    ? author.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim() || null
    : null);

/** Normalised title: other editions of the same book count as one. */
const titleKey = (title) => (title ?? '')
    .normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Pushes a candidate down when it resembles a disliked book more than what it was matched on.
 * Pure function: `matched` is its similarity to the taste / seed / query, `vector` its embedding.
 */
export const dislikePenalty = (vector, matched, negatives, weight) => {
    if (!vector || negatives.length === 0 || weight <= 0) return 0;
    let closest = -1;
    for (const negative of negatives) closest = Math.max(closest, dot(vector, negative));
    return weight * Math.max(0, closest - matched);
};

/**
 * Everything the recommender knows about a reader: their ratings, the vectors of the books they
 * liked (seeds and overall taste), disliked or dismissed, and which books to leave out.
 */
const loadReader = async (userId, settings) => {
    const [readBooks, dismissals, favoriteGenres] = await Promise.all([
        ReadBook.findAll({
            where: { userId },
            attributes: ['id', 'rating', 'bookId'],
            include: [{ model: Book, as: 'book', attributes: ['title', 'genre', ...EMOTIONS.map(emotionAttribute)] }],
        }),
        RecommendationDismissal.findAll({
            where: { userId },
            attributes: ['bookId'],
            include: [{ model: Book, as: 'book', attributes: ['title'] }],
        }),
        getFavoriteGenres(userId),
    ]);
    const minTasteRating = settings['recommendations.minTasteRating'];
    const liked = readBooks
        .filter((entry) => entry.rating >= minTasteRating)
        .sort((a, b) => b.rating - a.rating || b.id - a.id); // best rated, then most recently rated
    const dislikedIds = readBooks.filter((entry) => entry.rating <= DISLIKE_MAX_RATING).map((entry) => entry.bookId);
    const dismissedIds = dismissals.map((row) => row.bookId);

    const vectors = await getVectors(
        embeddingSpace(settings),
        [...liked.map((entry) => entry.bookId), ...dislikedIds, ...dismissedIds],
    );
    const likedWithVectors = liked.filter((entry) => vectors.has(entry.bookId));
    const taste = weightedCentroid(likedWithVectors.map((entry) => ({
        vector: vectors.get(entry.bookId),
        weight: tasteWeight(entry.rating, minTasteRating),
    })));
    const seeds = likedWithVectors
        .slice(0, settings['recommendations.maxSeeds'])
        .map((entry) => ({ id: entry.bookId, vector: vectors.get(entry.bookId) }));
    const negatives = [...dislikedIds, ...dismissedIds].map((id) => vectors.get(id)).filter(Boolean);

    const exclude = new Set(dismissedIds);
    // Titles left out too: the catalogue lists the same book once per edition / store.
    const excludedTitles = new Set(dismissals.map((row) => titleKey(row.book?.title)));
    if (settings['recommendations.excludeRead']) {
        for (const entry of readBooks) {
            exclude.add(entry.bookId);
            excludedTitles.add(titleKey(entry.book?.title));
        }
    }
    excludedTitles.delete('');

    const likedCount = likedWithVectors.length;
    return { readBooks, favoriteGenres, taste, seeds, negatives, exclude, excludedTitles, likedCount };
};

/** Searches around every query vector and keeps each book's best similarity. */
const gatherCandidates = async (space, queries, exclude) => {
    const results = await Promise.all(
        queries.map(({ vector, limit }) => searchSimilar(space, vector, { limit, exclude })),
    );
    const best = new Map();
    for (const list of results) {
        for (const { bookId, similarity } of list) {
            if (!best.has(bookId) || best.get(bookId) < similarity) best.set(bookId, similarity);
        }
    }
    return best;
};

/**
 * Shared tail of both modes: penalise disliked look-alikes, rank by emotion/genre, diversify,
 * then store the list and the run.
 *
 * @param {Map<number, { similarity: number, seed?: object|null }>} scored candidates
 */
const finish = async (userId, scored, vectors, { settings, reader, sentiment, preferredGenres, run, reasonFor }) => {
    if (scored.size === 0) {
        throw HttpError.serviceUnavailable('No book embeddings yet: an administrator must generate them first');
    }
    const ids = [...scored.keys()];
    const books = await Book.findAll({
        where: { id: ids },
        attributes: ['id', 'title', 'author', 'genre', ...EMOTIONS.map(emotionAttribute)],
        raw: true,
    });
    const booksById = new Map(books.map((book) => [book.id, book]));
    const weight = settings['recommendations.dislikeWeight'];
    const seenTitles = new Set(reader.excludedTitles);
    const candidates = ids.map((bookId) => {
        const { similarity } = scored.get(bookId);
        const penalty = dislikePenalty(vectors.get(bookId), similarity, reader.negatives, weight);
        return { bookId, similarity: similarity - penalty };
    });

    const ranked = rankCandidates(candidates, booksById, {
        sentiment,
        emotionWeight: settings['recommendations.emotionWeight'],
        preferredGenres,
        genreBoost: settings['recommendations.genreBoost'],
    });
    const top = ranked[0]?.score || 1;
    // One edition per title (the best ranked); the catalogue lists the same book from several stores.
    const uniqueRanked = ranked.filter(({ bookId }) => {
        const title = titleKey(booksById.get(bookId)?.title);
        if (seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
    });
    const picked = diversify(
        uniqueRanked.map(({ bookId, score }) => ({
            id: bookId,
            score: score / top,
            group: authorKey(booksById.get(bookId)?.author),
        })),
        vectors,
        {
            limit: settings['recommendations.resultCount'],
            diversity: settings['recommendations.diversity'],
            perGroup: settings['recommendations.maxPerAuthor'],
        },
    );

    const rows = picked.map(({ id, score }) => {
        const { reason, reasonBookId = null } = reasonFor(id, booksById.get(id), scored.get(id));
        return { userId, bookId: id, score: Math.max(0, Math.min(1, score)), source: run.source, reason, reasonBookId };
    });
    await sequelize.transaction(async (transaction) => {
        await Recommendation.destroy({ where: { userId }, transaction });
        await Recommendation.bulkCreate(rows, { transaction });
        await RecommendationRun.destroy({ where: { userId }, transaction });
        await RecommendationRun.create({ userId, ...run }, { transaction });
    });
    return rows;
};

/** Recommendations for free-text keywords, optionally favouring a tone and the reader's taste. */
export const recommendFromQuery = async (userId, { query, sentiment = null, personalized = false }) => {
    ensureAvailable();
    const settings = await getSettings();
    const space = embeddingSpace(settings);
    const [queryVector, reader] = await Promise.all([embedQuery(query, settings), loadReader(userId, settings)]);

    const share = personalized && reader.taste ? settings['recommendations.personalization'] : 0;
    const vector = share > 0
        ? normalize(queryVector.map((value, i) => (1 - share) * value + share * reader.taste[i]))
        : queryVector;
    const pool = settings['recommendations.candidatePool'];
    const similarities = await gatherCandidates(space, [{ vector, limit: pool }], reader.exclude);
    const vectors = await getVectors(space, [...similarities.keys()]);
    const scored = new Map([...similarities].map(([bookId, similarity]) => [bookId, { similarity }]));

    return finish(userId, scored, vectors, {
        settings,
        reader,
        sentiment,
        preferredGenres: [],
        run: {
            source: RECOMMENDATION_SOURCES.QUERY,
            query,
            sentiment,
            personalized: share > 0,
            seedCount: share > 0 ? reader.likedCount : 0,
        },
        reasonFor: () => ({ reason: RECOMMENDATION_REASONS.QUERY }),
    });
};

/**
 * Recommendations from the reader's profile. With liked books: candidates near the overall taste
 * and near each favourite book; each is scored half on the taste, half on its closest favourite
 * (which becomes the "because you liked" reason). Without: a query built from favourite genres.
 */
export const recommendFromProfile = async (userId) => {
    ensureAvailable();
    const settings = await getSettings();
    const space = embeddingSpace(settings);
    const reader = await loadReader(userId, settings);
    const profile = buildReadingProfile(reader.favoriteGenres, reader.readBooks);
    const pool = settings['recommendations.candidatePool'];

    const usesRatings = Boolean(reader.taste);
    const tasteVector = reader.taste ?? await embedQuery(profile.query, settings);
    const queries = [{ vector: tasteVector, limit: pool }];
    if (usesRatings && reader.seeds.length > 1) {
        const perSeed = Math.max(10, Math.ceil(pool / 2));
        for (const seed of reader.seeds) queries.push({ vector: seed.vector, limit: perSeed });
    }
    const similarities = await gatherCandidates(space, queries, reader.exclude);
    const vectors = await getVectors(space, [...similarities.keys()]);

    const scored = new Map();
    for (const [bookId, best] of similarities) {
        const vector = vectors.get(bookId);
        const seed = usesRatings && vector ? closestSeed(vector, reader.seeds) : null;
        const tasteSimilarity = vector ? dot(vector, tasteVector) : best;
        scored.set(bookId, { similarity: seed ? (tasteSimilarity + seed.similarity) / 2 : tasteSimilarity, seed });
    }

    const topGenres = new Set(profile.topGenres);
    await finish(userId, scored, vectors, {
        settings,
        reader,
        sentiment: profile.sentiment,
        preferredGenres: profile.topGenres,
        run: {
            source: RECOMMENDATION_SOURCES.PROFILE,
            sentiment: profile.sentiment,
            basedOn: usesRatings ? 'ratings' : 'genres',
            seedCount: reader.likedCount,
        },
        reasonFor: (_bookId, book, { seed }) => {
            if (seed) return { reason: RECOMMENDATION_REASONS.LIKED, reasonBookId: seed.id };
            return { reason: topGenres.has(book?.genre) ? RECOMMENDATION_REASONS.GENRE : null };
        },
    });
    return { ...profile, basedOn: usesRatings ? 'ratings' : 'genres', likedBooks: reader.likedCount };
};

// --- Reading the stored recommendations and feedback ------------------------------------------

/**
 * The user's current recommendations, best first: book cards with the reason for each, plus how
 * the list was generated (`run`, null when there is none).
 */
export const getCurrentRecommendations = async (userId) => {
    const [rows, run] = await Promise.all([
        Recommendation.findAll({
            where: { userId },
            attributes: ['bookId', 'score', 'reason'],
            include: [{ model: Book, as: 'reasonBook', attributes: ['id', 'title'] }],
            order: [['id', 'ASC']],
        }),
        RecommendationRun.findByPk(userId),
    ]);
    const books = await getBookSummaries(rows.map((row) => row.bookId));
    const booksById = new Map(books.map((book) => [book.id, book]));
    const items = rows
        .filter((row) => booksById.has(row.bookId))
        .map((row) => ({
            book: booksById.get(row.bookId),
            score: row.score,
            reason: row.reason,
            reasonBook: row.reasonBook,
        }));
    return { items, run };
};

/** "Not interested": removes the book from the list and keeps it out of future recommendations. */
export const dismissBook = async (userId, bookId) => {
    if (!await Book.count({ where: { id: bookId } })) throw HttpError.notFound('Book not found');
    await RecommendationDismissal.findOrCreate({ where: { userId, bookId } });
    await Recommendation.destroy({ where: { userId, bookId } });
};

/** Forgets every "not interested" of the user; returns how many there were. */
export const clearDismissals = (userId) => RecommendationDismissal.destroy({ where: { userId } });

export const countDismissals = (userId) => RecommendationDismissal.count({ where: { userId } });

// --- Similar books ------------------------------------------------------------------------------

const SIMILAR_CACHE_MS = 10 * 60 * 1000;
const SIMILAR_CACHE_SIZE = 500;
const similarCache = new Map();


/**
 * Books closest in meaning to `bookId`, from its stored embedding: no AI provider call, so it
 * works (and costs nothing) even without an API key. Other editions are left out and authors
 * capped for variety. Returns book ids, best first ([] when the book has no embedding).
 */
export const getSimilarBookIds = async (bookId, limit = 8) => {
    const settings = await getSettings();
    const space = embeddingSpace(settings);
    // The index load time is part of the key: rebuilt embeddings never serve stale neighbours.
    const key = `${space.model}|${space.dimensions}|${getIndexStats().loadedAt ?? ''}|${bookId}|${limit}`;
    const cached = similarCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.ids;

    const source = await Book.findByPk(bookId, { attributes: ['id', 'title'] });
    if (!source) throw HttpError.notFound('Book not found');
    const vector = (await getVectors(space, [bookId])).get(bookId);
    let ids = [];
    if (vector) {
        const candidates = await searchSimilar(space, vector, { limit: limit * 4, exclude: new Set([bookId]) });
        const books = await Book.findAll({
            where: { id: candidates.map((candidate) => candidate.bookId) },
            attributes: ['id', 'title', 'author'],
            raw: true,
        });
        const booksById = new Map(books.map((book) => [book.id, book]));
        const seenTitles = new Set([titleKey(source.title)]);
        const unique = candidates.filter((candidate) => {
            const title = titleKey(booksById.get(candidate.bookId)?.title);
            if (!title || seenTitles.has(title)) return false;
            seenTitles.add(title);
            return true;
        });
        const vectors = await getVectors(space, unique.map((candidate) => candidate.bookId));
        const best = unique[0]?.similarity || 1;
        ids = diversify(
            unique.map((candidate) => ({
                id: candidate.bookId,
                score: candidate.similarity / best,
                group: authorKey(booksById.get(candidate.bookId)?.author),
            })),
            vectors,
            { limit, diversity: 0.15, perGroup: 2 },
        ).map((item) => item.id);
    }

    similarCache.set(key, { ids, expiresAt: Date.now() + SIMILAR_CACHE_MS });
    if (similarCache.size > SIMILAR_CACHE_SIZE) similarCache.delete(similarCache.keys().next().value);
    return ids;
};
