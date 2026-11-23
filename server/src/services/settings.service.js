/**
 * Tunable parameters edited from the admin panel. Every setting is declared here with its type,
 * limits and default; only values that differ from the default are stored (app_settings), so
 * new defaults apply automatically and "reset" simply deletes the row.
 */
import { AppSetting } from '../models/index.js';
import HttpError from '../utils/http-error.js';

/**
 * @typedef {{ key: string, group: string, type: 'integer'|'number'|'string'|'boolean',
 *   default: unknown, min?: number, max?: number, maxLength?: number }} SettingDefinition
 */

/** @type {SettingDefinition[]} */
export const SETTING_DEFINITIONS = Object.freeze([
    // --- Embeddings (semantic search) ---
    // 4B: within ~1 MTEB point of 8B but answers a query in ~0.25 s instead of 4–6 s on DeepInfra.
    { key: 'embeddings.model', group: 'embeddings', type: 'string', default: 'Qwen/Qwen3-Embedding-4B', maxLength: 128 },
    /** Vectors are shortened to this many values (Matryoshka); changing it requires re-embedding. */
    { key: 'embeddings.dimensions', group: 'embeddings', type: 'integer', default: 1024, min: 64, max: 4096 },
    { key: 'embeddings.batchSize', group: 'embeddings', type: 'integer', default: 32, min: 1, max: 256 },
    { key: 'embeddings.concurrency', group: 'embeddings', type: 'integer', default: 4, min: 1, max: 8 },
    /** Longer descriptions are cut to this many characters before embedding. */
    { key: 'embeddings.maxChars', group: 'embeddings', type: 'integer', default: 6000, min: 500, max: 30000 },
    /** Task instruction prepended to search queries (Qwen3-Embedding format); empty disables it. */
    {
        key: 'embeddings.queryInstruction',
        group: 'embeddings',
        type: 'string',
        default: "Given a reader's request, retrieve books whose description matches it",
        maxLength: 300,
    },

    // --- Recommendations ---
    { key: 'recommendations.resultCount', group: 'recommendations', type: 'integer', default: 16, min: 1, max: 50 },
    /** Nearest books considered before re-ranking by emotion and genre. */
    { key: 'recommendations.candidatePool', group: 'recommendations', type: 'integer', default: 100, min: 10, max: 500 },
    /** 0 = rank by meaning only, 1 = rank by the requested emotion only. */
    { key: 'recommendations.emotionWeight', group: 'recommendations', type: 'number', default: 0.35, min: 0, max: 1 },
    /** Score bonus for books in the reader's preferred genres (profile recommendations). */
    { key: 'recommendations.genreBoost', group: 'recommendations', type: 'number', default: 0.05, min: 0, max: 0.5 },
    /** Books rated at least this high define the reader's taste. */
    { key: 'recommendations.minTasteRating', group: 'recommendations', type: 'integer', default: 4, min: 1, max: 5 },
    { key: 'recommendations.excludeRead', group: 'recommendations', type: 'boolean', default: true },

    // --- Emotion analysis ---
    { key: 'emotions.model', group: 'emotions', type: 'string', default: 'meta-llama/Meta-Llama-3.1-8B-Instruct', maxLength: 128 },
    { key: 'emotions.concurrency', group: 'emotions', type: 'integer', default: 3, min: 1, max: 8 },
    { key: 'emotions.maxChars', group: 'emotions', type: 'integer', default: 3000, min: 200, max: 8000 },
    /** Books with shorter descriptions carry too little signal to score. */
    { key: 'emotions.minDescriptionLength', group: 'emotions', type: 'integer', default: 100, min: 0, max: 2000 },

    // --- Scraper ---
    { key: 'scraper.concurrency', group: 'scraper', type: 'integer', default: 2, min: 1, max: 4 },
    { key: 'scraper.requestDelayMs', group: 'scraper', type: 'integer', default: 2000, min: 500, max: 10000 },
]);

const DEFINITIONS_BY_KEY = new Map(SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));
const DEFAULTS = Object.freeze(Object.fromEntries(SETTING_DEFINITIONS.map((d) => [d.key, d.default])));

/** Validates one value against its definition; throws a 400 naming the setting. */
export const validateSetting = (key, value) => {
    const definition = DEFINITIONS_BY_KEY.get(key);
    if (!definition) throw HttpError.badRequest(`Unknown setting: ${key}`);
    const fail = (rule) => { throw HttpError.badRequest(`Setting ${key} ${rule}`); };

    switch (definition.type) {
        case 'boolean':
            if (typeof value !== 'boolean') fail('must be true or false');
            return value;
        case 'string': {
            if (typeof value !== 'string') fail('must be text');
            const text = value.trim();
            if (text.length > definition.maxLength) fail(`must be at most ${definition.maxLength} characters`);
            if (key.endsWith('.model') && !text) fail('must not be empty');
            return text;
        }
        case 'integer':
        case 'number': {
            const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
            if (typeof number !== 'number' || !Number.isFinite(number)) fail('must be a number');
            if (definition.type === 'integer' && !Number.isInteger(number)) fail('must be a whole number');
            if (number < definition.min || number > definition.max) fail(`must be between ${definition.min} and ${definition.max}`);
            return number;
        }
        default:
            throw new Error(`Unsupported setting type ${definition.type}`);
    }
};

let cache = null;

/** Current values (defaults merged with stored overrides). Cached in memory. */
export const getSettings = async () => {
    if (!cache) {
        const rows = await AppSetting.findAll();
        const stored = {};
        for (const { key, value } of rows) {
            // Ignore rows for settings that no longer exist or no longer validate.
            if (!DEFINITIONS_BY_KEY.has(key)) continue;
            try {
                stored[key] = validateSetting(key, value);
            } catch {
                // Fall back to the default.
            }
        }
        cache = Object.freeze({ ...DEFAULTS, ...stored });
    }
    return cache;
};

/**
 * Applies a partial update. A `null` value resets that setting to its default.
 * All values are validated before anything is written.
 */
export const updateSettings = async (changes) => {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        throw HttpError.badRequest('Expected an object of settings');
    }
    const updates = [];
    const resets = [];
    for (const [key, value] of Object.entries(changes)) {
        if (value === null) {
            if (!DEFINITIONS_BY_KEY.has(key)) throw HttpError.badRequest(`Unknown setting: ${key}`);
            resets.push(key);
            continue;
        }
        const valid = validateSetting(key, value);
        if (valid === DEFAULTS[key]) resets.push(key);
        else updates.push({ key, value: valid });
    }

    if (resets.length) await AppSetting.destroy({ where: { key: resets } });
    if (updates.length) await AppSetting.bulkCreate(updates, { updateOnDuplicate: ['value', 'updatedAt'] });
    cache = null;
    return getSettings();
};

/** Definitions for the admin form (type, limits, default). */
export const getSettingDefinitions = () => SETTING_DEFINITIONS;

/** For tests: forget cached values. */
export const clearSettingsCache = () => { cache = null; };
