/**
 * One-off maintenance script: shrinks photos uploaded before server-side optimisation existed.
 *
 * Files keep their name and format (the database stores their paths), but are resized to at most
 * MAX_IMAGE_DIMENSION pixels, re-compressed and stripped of metadata. Already-small files are
 * left untouched, so running it twice is harmless.
 *
 *   node scripts/optimize-uploads.js            # optimise in place
 *   node scripts/optimize-uploads.js --dry-run  # only report what would change
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { UPLOAD_FOLDERS, UPLOADS_ROOT } from '../src/config/paths.js';
import { MAX_IMAGE_DIMENSION } from '../src/utils/images.js';

const SMALL_ENOUGH_BYTES = 250 * 1024;
const ENCODERS = {
    '.jpg': (image) => image.jpeg({ quality: 80, mozjpeg: true }),
    '.jpeg': (image) => image.jpeg({ quality: 80, mozjpeg: true }),
    '.png': (image) => image.png({ compressionLevel: 9, palette: true }),
    '.webp': (image) => image.webp({ quality: 80 }),
};

const dryRun = process.argv.includes('--dry-run');
let before = 0;
let after = 0;

for (const folder of Object.values(UPLOAD_FOLDERS)) {
    const directory = path.join(UPLOADS_ROOT, folder);
    const files = await fs.readdir(directory).catch(() => []);

    for (const file of files) {
        const encode = ENCODERS[path.extname(file).toLowerCase()];
        if (!encode) continue;

        const filePath = path.join(directory, file);
        const input = await fs.readFile(filePath);
        const { width = 0, height = 0 } = await sharp(input).metadata();
        before += input.length;

        if (input.length <= SMALL_ENOUGH_BYTES && Math.max(width, height) <= MAX_IMAGE_DIMENSION) {
            after += input.length;
            continue;
        }

        const output = await encode(
            sharp(input).rotate().resize({
                width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true,
            }),
        ).toBuffer();

        // Never replace a file with a bigger one.
        const best = output.length < input.length ? output : input;
        after += best.length;
        if (!dryRun && best === output) await fs.writeFile(filePath, output);
        console.log(`${folder}/${file}: ${Math.round(input.length / 1024)} KB -> ${Math.round(best.length / 1024)} KB`);
    }
}

console.log(`${dryRun ? '[dry run] ' : ''}Total: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
