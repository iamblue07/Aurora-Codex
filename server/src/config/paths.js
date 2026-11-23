import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './env.js';

/** Absolute path of the `server/` folder, independent of the current working directory. */
export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Root of every user upload; database columns store paths relative to it.
 * Override with UPLOADS_DIR, e.g. to point at a persistent disk in production.
 */
export const UPLOADS_ROOT = path.resolve(SERVER_ROOT, process.env.UPLOADS_DIR?.trim() || 'uploads');

export const UPLOAD_FOLDERS = Object.freeze({
    /** Avatars and listing pictures; served publicly at /uploads/images. */
    images: 'images',
    /** Files sent in private chats; only reachable through an authorised endpoint. */
    chatMedia: 'chat-media',
});

export const LOGS_DIR = path.join(SERVER_ROOT, 'logs');

export const ensureDirectories = () => {
    for (const folder of Object.values(UPLOAD_FOLDERS)) {
        fs.mkdirSync(path.join(UPLOADS_ROOT, folder), { recursive: true });
    }
    fs.mkdirSync(LOGS_DIR, { recursive: true });
};

/** Path persisted in the database for an uploaded file, e.g. `images/1745342916717.jpg`. */
export const toStoredPath = (folder, filename) => `${folder}/${filename}`;

/**
 * Resolves a stored (relative) path into an absolute one inside UPLOADS_ROOT.
 * Returns `null` for empty values and for paths that would escape the uploads folder.
 */
export const resolveStoredPath = (storedPath) => {
    if (!storedPath) return null;
    const absolute = path.resolve(UPLOADS_ROOT, storedPath);
    return absolute.startsWith(UPLOADS_ROOT + path.sep) ? absolute : null;
};

/**
 * Public URL of a stored image, or `null` when there is none: an absolute R2 URL with R2 storage,
 * otherwise a path served by this API (`/uploads/images/...`).
 */
export const publicImageUrl = (storedPath) => {
    if (!storedPath?.startsWith(`${UPLOAD_FOLDERS.images}/`)) return null;
    const { driver, r2 } = config.storage;
    return driver === 'r2' ? `${r2.publicUrl}/${r2.folder}/${storedPath}` : `/uploads/${storedPath}`;
};
