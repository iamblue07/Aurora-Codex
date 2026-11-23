import HttpError from './http-error.js';

/**
 * Small, dependency-free input parsers. Each one either returns a clean value
 * or throws a 400 {@link HttpError} with a descriptive message.
 */

const isBlank = (value) => value === undefined || value === null || value === '' ||
    value === 'null' || value === 'undefined';

export const parseId = (value, field = 'id') => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw HttpError.badRequest(`${field} must be a positive integer`);
    }
    return parsed;
};

export const parseOptionalId = (value, field = 'id') => (isBlank(value) ? null : parseId(value, field));

export const parseIdList = (value, { field = 'ids', max = 200 } = {}) => {
    if (!Array.isArray(value) || value.length === 0) {
        throw HttpError.badRequest(`${field} must be a non-empty array`);
    }
    if (value.length > max) {
        throw HttpError.badRequest(`${field} may contain at most ${max} items`);
    }
    return value.map((item) => parseId(item, field));
};

/** Parses `"1,2,3"` or `["1","2"]` (query strings) into an array of trimmed, non-empty strings. */
export const parseList = (value) => {
    if (isBlank(value)) return [];
    const items = Array.isArray(value) ? value : String(value).split(',');
    return items.map((item) => String(item).trim()).filter(Boolean);
};

export const parseOptionalNumber = (value, field, options) =>
    (isBlank(value) ? null : parseNumber(value, field, options));

export const parseNumber = (value, field, { min = -Infinity, max = Infinity } = {}) => {
    const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);
    if (isBlank(value) || !Number.isFinite(parsed) || parsed < min || parsed > max) {
        throw HttpError.badRequest(`${field} must be a valid number`);
    }
    return parsed;
};

export const parseInteger = (value, field, options) => {
    const parsed = parseNumber(value, field, options);
    if (!Number.isInteger(parsed)) {
        throw HttpError.badRequest(`${field} must be an integer`);
    }
    return parsed;
};

export const parseBoolean = (value, field) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    throw HttpError.badRequest(`${field} must be a boolean`);
};

export const parseOptionalBoolean = (value, field, fallback = null) =>
    (isBlank(value) ? fallback : parseBoolean(value, field));

export const requireString = (value, field, { maxLength = 255, minLength = 1 } = {}) => {
    if (typeof value !== 'string') {
        throw HttpError.badRequest(`${field} is required`);
    }
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
        throw HttpError.badRequest(`${field} must be at least ${minLength} characters long`);
    }
    if (trimmed.length > maxLength) {
        throw HttpError.badRequest(`${field} must be at most ${maxLength} characters long`);
    }
    return trimmed;
};

export const optionalString = (value, field, options) =>
    (isBlank(value) ? '' : requireString(value, field, { ...options, minLength: 0 }));

export const parseOptionalEnum = (value, field, allowed, fallback = null) =>
    (isBlank(value) ? fallback : parseEnum(value, field, allowed));

export const parseEnum = (value, field, allowed) => {
    if (!allowed.includes(value)) {
        throw HttpError.badRequest(`${field} must be one of: ${allowed.join(', ')}`);
    }
    return value;
};

/** Normalises `page`/`limit` style pagination input into `{ page, limit, offset }`. */
const MAX_PAGE = 10_000;

export const parsePagination = (page, limit, { defaultLimit = 10, maxLimit = 100 } = {}) => {
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    // Capped: absurd pages would only make the database skip millions of rows for nothing.
    const safePage = Number.isInteger(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, MAX_PAGE) : 1;
    const safeLimit = Number.isInteger(limitNumber) && limitNumber > 0
        ? Math.min(limitNumber, maxLimit)
        : defaultLimit;
    return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
};

/** Escapes `%`, `_` and `\` so user input is matched literally inside a SQL LIKE pattern. */
export const toLikePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
