import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Longest side, in pixels, of every stored photo (plenty for the largest place it is shown). */
export const MAX_IMAGE_DIMENSION = 1200;
const WEBP_QUALITY = 80;

/**
 * Re-encodes an uploaded photo as a compressed WebP no larger than MAX_IMAGE_DIMENSION, honouring
 * the EXIF orientation and dropping metadata (location, camera…). The original file is removed.
 * Phone photos shrink from several MB to roughly 100–200 KB.
 *
 * @returns {Promise<{ filename: string, path: string, size: number }>} the new file
 */
export const optimizeImageFile = async (filePath) => {
    const parsed = path.parse(filePath);
    const outputPath = path.join(parsed.dir, `${parsed.name}.webp`);
    // Work in memory: a .webp upload has the same output path, and libvips can't overwrite a
    // file it is reading (on Windows it also keeps the input open until its cache drops it).
    const data = await sharp(await fs.readFile(filePath))
        .rotate()
        .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    await fs.writeFile(outputPath, data);
    if (outputPath !== filePath) await fs.unlink(filePath);
    return { filename: path.basename(outputPath), path: outputPath, size: data.length };
};
