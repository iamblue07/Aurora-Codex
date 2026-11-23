/**
 * Stored files (avatars, listing photos, chat attachments) on the configured storage:
 * the local uploads folder, or Cloudflare R2 (see config.storage). Paths are always relative,
 * e.g. `images/123.webp`, whichever storage holds the file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import config from '../config/env.js';
import { UPLOAD_FOLDERS, resolveStoredPath } from '../config/paths.js';
import { deleteObject, getObject, putObject } from '../services/storage/r2.js';
import HttpError from './http-error.js';
import logger from './logger.js';

const isRemote = () => config.storage.driver === 'r2';

const CONTENT_TYPES = {
    '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf',
};
const contentTypeOf = (storedPath) => CONTENT_TYPES[path.extname(storedPath).toLowerCase()] ?? 'application/octet-stream';
/** Public images have unique names, so they can be cached forever; chat media stays private. */
const cacheControlOf = (storedPath) => (storedPath.startsWith(`${UPLOAD_FOLDERS.images}/`)
    ? 'public, max-age=31536000, immutable'
    : 'private, no-store');
const objectHeaders = (storedPath) => ({
    contentType: contentTypeOf(storedPath),
    cacheControl: cacheControlOf(storedPath),
});

/**
 * Persists a file that is on local disk (a fresh upload) at `storedPath`. With R2 storage the
 * file is uploaded and the local copy deleted; with local storage it is already in place.
 */
export const persistLocalFile = async (localPath, storedPath) => {
    if (!isRemote()) return;
    const body = await fs.readFile(localPath);
    await putObject(storedPath, body, objectHeaders(storedPath));
    await fs.rm(localPath, { force: true });
};

/** Stores generated content (e.g. demo photos) at `storedPath`. */
export const storeBuffer = async (storedPath, buffer) => {
    if (isRemote()) {
        await putObject(storedPath, buffer, objectHeaders(storedPath));
        return;
    }
    const absolute = resolveStoredPath(storedPath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);
};

/** Deletes a previously stored file. Missing files are ignored; other errors are only logged. */
export const removeStoredFile = async (storedPath) => {
    if (!storedPath) return;
    try {
        if (isRemote()) {
            await deleteObject(storedPath);
            return;
        }
        const absolute = resolveStoredPath(storedPath);
        if (absolute) await fs.unlink(absolute);
    } catch (error) {
        if (error.code !== 'ENOENT') logger.warn(`Could not delete file ${storedPath}: ${error.message}`);
    }
};

/** Sends a stored file, or throws 404 if it is missing. */
export const sendStoredFile = async (res, storedPath, notFoundMessage = 'File not found') => {
    if (!storedPath) throw HttpError.notFound(notFoundMessage);
    if (isRemote()) {
        const object = await getObject(storedPath);
        if (!object?.body) throw HttpError.notFound(notFoundMessage);
        res.set('Content-Type', object.headers.get('content-type') ?? contentTypeOf(storedPath));
        Readable.fromWeb(object.body).on('error', () => res.destroy()).pipe(res);
        return;
    }
    const absolute = resolveStoredPath(storedPath);
    if (!absolute) throw HttpError.notFound(notFoundMessage);
    try {
        await fs.access(absolute);
    } catch {
        throw HttpError.notFound(notFoundMessage);
    }
    res.sendFile(absolute);
};
