import path from 'node:path';
import multer from 'multer';
import { BaseError, ConnectionError, ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';
import { UPLOADS_ROOT } from '../config/paths.js';
import { AiProviderError } from '../services/ai/deepinfra.client.js';
import { removeStoredFile } from '../utils/files.js';
import HttpError from '../utils/http-error.js';
import logger from '../utils/logger.js';

/** Translates known library errors into {@link HttpError}s. */
const normalise = (err) => {
    if (err instanceof HttpError) return err;

    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : `Invalid upload: ${err.message}`;
        return HttpError.badRequest(message);
    }
    if (err instanceof UniqueConstraintError) {
        const fields = Object.keys(err.fields ?? {}).join(', ');
        return HttpError.conflict(fields ? `Value already in use: ${fields}` : 'Resource already exists');
    }
    if (err instanceof ValidationError) {
        return HttpError.badRequest('Validation failed', err.errors?.map((e) => e.message));
    }
    // The database went away while the server runs (it reconnects by itself when it is back).
    if (err instanceof ConnectionError) {
        return HttpError.serviceUnavailable('The database is unavailable, try again shortly');
    }
    if (err instanceof ForeignKeyConstraintError) {
        return HttpError.conflict('Operation violates a data integrity constraint');
    }
    // Provider details stay in the server log: clients only learn that the AI call failed.
    if (err instanceof AiProviderError) {
        return HttpError.badGateway('The AI provider returned an error');
    }
    if (err?.type === 'entity.parse.failed') {
        return HttpError.badRequest('Malformed JSON body');
    }
    if (err?.type === 'entity.too.large') {
        return new HttpError(413, 'Request body too large');
    }
    return null;
};

/** Express 404 handler for unmatched routes. */
export const notFoundHandler = (req, _res, next) => {
    next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/** Central error handler: every error ends up here and is returned as `{ error }` JSON. */
export const errorHandler = (err, req, res, _next) => {
    // Files may already be stored when a later step fails: don't leave them orphaned.
    for (const file of [req.file, ...(Array.isArray(req.files) ? req.files : [])]) {
        if (file?.path) removeStoredFile(path.relative(UPLOADS_ROOT, file.path).split(path.sep).join('/'));
    }

    const httpError = normalise(err);
    if (!httpError) {
        const label = err instanceof BaseError ? 'Database error' : 'Unhandled error';
        logger.error(`${label} on ${req.method} ${req.originalUrl}:`, err);
    } else if (httpError.status >= 500) {
        const cause = err instanceof AiProviderError || err instanceof ConnectionError ? ` (${err.message})` : '';
        logger.warn(`${req.method} ${req.originalUrl} failed with ${httpError.status}: ${httpError.message}${cause}`);
    }

    if (res.headersSent) return;

    const status = httpError?.status ?? 500;
    const body = { error: httpError?.message ?? 'Internal server error' };
    if (httpError?.details) body.details = httpError.details;
    res.status(status).json(body);
};
