import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import { MAX_IMAGE_DIMENSION, optimizeImageFile } from '../../src/utils/images.js';

const createImage = (filePath, format) => sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 200, g: 40, b: 40 } },
}).toFormat(format).toFile(filePath);

describe('optimizeImageFile', () => {
    let dir;
    before(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'images-test-')); });
    after(() => fs.rm(dir, { recursive: true, force: true }));

    it('converts a PNG to a resized WebP and removes the original', async () => {
        const input = path.join(dir, 'photo.png');
        await createImage(input, 'png');

        const result = await optimizeImageFile(input);

        assert.equal(result.filename, 'photo.webp');
        await assert.rejects(fs.access(input));
        const meta = await sharp(await fs.readFile(result.path)).metadata();
        assert.equal(meta.format, 'webp');
        assert.equal(Math.max(meta.width, meta.height), MAX_IMAGE_DIMENSION);
        assert.equal(result.size, (await fs.stat(result.path)).size);
    });

    it('re-encodes a WebP upload in place (same input and output path)', async () => {
        const input = path.join(dir, 'already.webp');
        await createImage(input, 'webp');

        const result = await optimizeImageFile(input);

        assert.equal(result.path, input);
        const meta = await sharp(await fs.readFile(input)).metadata();
        assert.equal(meta.width, MAX_IMAGE_DIMENSION);
    });

    it('rejects a file that is not an image', async () => {
        const input = path.join(dir, 'fake.jpg');
        await fs.writeFile(input, 'not an image');
        await assert.rejects(optimizeImageFile(input));
    });
});
