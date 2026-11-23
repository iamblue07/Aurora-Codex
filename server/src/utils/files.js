import fs from 'node:fs/promises';
import { resolveStoredPath } from '../config/paths.js';
import HttpError from './http-error.js';
import logger from './logger.js';

/** Deletes a previously uploaded file. Missing files are ignored; other errors are only logged. */
export const removeStoredFile = async (storedPath) => {
    const absolute = resolveStoredPath(storedPath);
    if (!absolute) return;
    try {
        await fs.unlink(absolute);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            logger.warn(`Could not delete file ${storedPath}: ${error.message}`);
        }
    }
};

/** Sends a stored file, or throws 404 if it is missing on disk. */
export const sendStoredFile = async (res, storedPath, notFoundMessage = 'File not found') => {
    const absolute = resolveStoredPath(storedPath);
    if (!absolute) throw HttpError.notFound(notFoundMessage);
    try {
        await fs.access(absolute);
    } catch {
        throw HttpError.notFound(notFoundMessage);
    }
    res.sendFile(absolute);
};
