/** Read-only overview of the AI features for the admin panel, plus a connection test. */
import { Op, Sequelize } from 'sequelize';
import config from '../../config/env.js';
import { emotionAttribute } from '../../constants/domain.js';
import { Book, BookEmbedding } from '../../models/index.js';
import { isScraperAvailable } from '../scraper/scraper.service.js';
import { getSettings } from '../settings.service.js';
import { buildQueryText } from './book-text.js';
import { embed, isAiConfigured } from './deepinfra.client.js';
import { getIndexStats, loadIndex } from './vector-index.js';
import logger from '../../utils/logger.js';

const FEATURES_CACHE_MS = 60_000;
let featuresCache = { value: null, expiresAt: 0 };

/** Coverage of embeddings and emotion scores across the catalogue. */
export const getAiStatus = async () => {
    const settings = await getSettings();
    const model = settings['embeddings.model'];
    const dimensions = settings['embeddings.dimensions'];
    const minLength = settings['emotions.minDescriptionLength'];
    const longEnough = Sequelize.where(Sequelize.fn('CHAR_LENGTH', Sequelize.col('description')), { [Op.gte]: minLength });

    const otherSpace = { [Op.or]: [{ model: { [Op.ne]: model } }, { dimensions: { [Op.ne]: dimensions } }] };
    const [
        totalBooks, embeddedBooks, otherSpaceBooks, emotionEligible, emotionScored, scraperAvailable,
    ] = await Promise.all([
        Book.count(),
        BookEmbedding.count({ where: { model, dimensions } }),
        BookEmbedding.count({ where: otherSpace }),
        Book.count({ where: longEnough }),
        Book.count({ where: { [Op.and]: [longEnough, { [emotionAttribute('joy')]: { [Op.ne]: null } }] } }),
        isScraperAvailable(),
    ]);

    return {
        provider: {
            name: 'DeepInfra',
            configured: isAiConfigured(),
            baseUrl: config.ai.baseUrl,
        },
        catalogue: { totalBooks },
        embeddings: {
            model,
            dimensions,
            embeddedBooks,
            /** Vectors made with another model/size: unusable until re-generated. */
            outdatedBooks: otherSpaceBooks,
            missingBooks: totalBooks - embeddedBooks,
        },
        emotions: {
            model: settings['emotions.model'],
            eligibleBooks: emotionEligible,
            scoredBooks: emotionScored,
        },
        index: getIndexStats(),
        scraper: { available: scraperAvailable },
    };
};

/** Embeds a sample query to check the key, the model and the vector size. */
export const testAiConnection = async () => {
    const settings = await getSettings();
    const startedAt = Date.now();
    const { vectors, tokens } = await embed(
        [buildQueryText('un roman polițist cu suspans', settings['embeddings.queryInstruction'])],
        { model: settings['embeddings.model'] },
    );
    return {
        ok: true,
        model: settings['embeddings.model'],
        nativeDimensions: vectors[0].length,
        storedDimensions: Math.min(vectors[0].length, settings['embeddings.dimensions']),
        latencyMs: Date.now() - startedAt,
        tokens,
    };
};

/** What the public client may show (cached briefly: it is requested on every page load). */
export const getPublicFeatures = async () => {
    if (featuresCache.value && featuresCache.expiresAt > Date.now()) return featuresCache.value;
    const settings = await getSettings();
    const hasEmbeddings = (await BookEmbedding.count({
        where: { model: settings['embeddings.model'], dimensions: settings['embeddings.dimensions'] },
    })) > 0;
    // Recommendations embed queries (paid provider); similar books only read stored vectors.
    featuresCache = {
        value: { recommendations: hasEmbeddings && isAiConfigured(), similarBooks: hasEmbeddings },
        expiresAt: Date.now() + FEATURES_CACHE_MS,
    };
    return featuresCache.value;
};

/**
 * Loads the stored vectors into memory right after startup, so the first recommendation after a
 * restart doesn't wait for it. Reads MySQL only: no AI provider call, no cost.
 */
export const warmUpSearchIndex = async () => {
    if (!isAiConfigured()) return;
    try {
        const settings = await getSettings();
        const space = { model: settings['embeddings.model'], dimensions: settings['embeddings.dimensions'] };
        if ((await BookEmbedding.count({ where: space })) > 0) await loadIndex(space);
    } catch (error) {
        logger.warn(`[vector-index] warm-up failed, it will load on first use: ${error.message}`);
    }
};

export const clearFeaturesCache = () => { featuresCache = { value: null, expiresAt: 0 }; };
