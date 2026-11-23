import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { UPLOADS_ROOT, UPLOAD_FOLDERS } from '../config/paths.js';
import HttpError from '../utils/http-error.js';
import { optimizeImageFile } from '../utils/images.js';
import logger from '../utils/logger.js';

const MB = 1024 * 1024;

const IMAGE_TYPES = Object.freeze({
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.webp': ['image/webp'],
});

const MEDIA_TYPES = Object.freeze({
    ...IMAGE_TYPES,
    '.pdf': ['application/pdf'],
});

const uniqueFilename = (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
};

/** Accepts a file only when both its extension and its MIME type are in the allow-list. */
const fileFilterFor = (allowedTypes, errorMessage) => (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowed = allowedTypes[extension]?.includes(file.mimetype.toLowerCase());
    cb(isAllowed ? null : HttpError.badRequest(errorMessage), Boolean(isAllowed));
};

const createUploader = ({ folder, allowedTypes, maxSizeMb, errorMessage }) => multer({
    storage: multer.diskStorage({
        destination: path.join(UPLOADS_ROOT, folder),
        filename: uniqueFilename,
    }),
    limits: { fileSize: maxSizeMb * MB, files: 1 },
    fileFilter: fileFilterFor(allowedTypes, errorMessage),
});

/** True when the file starts with the PDF signature (the declared type alone can be faked). */
const hasPdfSignature = async (filePath) => {
    const handle = await fs.open(filePath, 'r');
    try {
        const { buffer, bytesRead } = await handle.read(Buffer.alloc(5), 0, 5, 0);
        return bytesRead === 5 && buffer.toString('latin1') === '%PDF-';
    } finally {
        await handle.close();
    }
};

/**
 * Checks the uploaded file. Shrinks a photo (see optimizeImageFile) and updates `req.file` to point at the
 * optimised file. PDFs are kept as they are, once their signature is verified.
 */
const verifyUploadedFile = async (req, _res, next) => {
    if (req.file && !req.file.mimetype.startsWith('image/')) {
        try {
            if (await hasPdfSignature(req.file.path)) return next();
            await fs.rm(req.file.path, { force: true });
            return next(HttpError.badRequest('The file is not a valid PDF'));
        } catch (error) {
            return next(error);
        }
    }
    if (!req.file) return next();
    try {
        const optimized = await optimizeImageFile(req.file.path);
        Object.assign(req.file, optimized, { mimetype: 'image/webp' });
        return next();
    } catch (error) {
        logger.warn(`Rejected an unreadable image upload: ${error.message}`);
        await fs.rm(req.file.path, { force: true }); // don't keep rejected files on disk
        return next(HttpError.badRequest('The file is not a valid image'));
    }
};

const imageUploader = createUploader({
    folder: UPLOAD_FOLDERS.images,
    allowedTypes: IMAGE_TYPES,
    maxSizeMb: 10,
    errorMessage: 'Only JPEG, PNG and WebP images are allowed',
});

const chatMediaUploader = createUploader({
    folder: UPLOAD_FOLDERS.chatMedia,
    allowedTypes: MEDIA_TYPES,
    maxSizeMb: 10,
    errorMessage: 'Only JPEG, PNG, WebP and PDF files are allowed',
});

/** Profile pictures and listing photos (stored in `uploads/images/`, served publicly). */
export const uploadImage = (field) => [imageUploader.single(field), verifyUploadedFile];

/** Files sent in marketplace chats (stored in `uploads/chat-media/`, private). */
export const uploadChatMedia = (field) => [chatMediaUploader.single(field), verifyUploadedFile];
