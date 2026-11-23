/**
 * Copies every locally stored file that the database references (listing photos, avatars, chat
 * attachments, uploaded covers) to the configured R2 bucket. Use it after switching an existing
 * database to R2 storage.
 *
 *   node scripts/upload-local-files.js [--dir <extra folder to search>] [--dry-run]
 *
 * Files are looked up in UPLOADS_DIR, then in db/deploy/uploads (demo photos) and any --dir.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { QueryTypes } from 'sequelize';
import config from '../src/config/env.js';
import { SERVER_ROOT, UPLOADS_ROOT } from '../src/config/paths.js';
import sequelize, { closeDatabase } from '../src/database/connection.js';
import { storeBuffer } from '../src/utils/files.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const extraDir = args.includes('--dir') ? path.resolve(args[args.indexOf('--dir') + 1]) : null;
const SEARCH_DIRS = [UPLOADS_ROOT, path.join(SERVER_ROOT, 'db', 'deploy', 'uploads'), extraDir].filter(Boolean);

const REFERENCES = [
    'SELECT image_path AS p FROM listings WHERE image_path IS NOT NULL',
    'SELECT avatar_path AS p FROM users WHERE avatar_path IS NOT NULL',
    'SELECT media_path AS p FROM chat_messages WHERE media_path IS NOT NULL',
    "SELECT cover_image AS p FROM books WHERE cover_image IS NOT NULL AND cover_image NOT LIKE 'http%'",
];

const findLocal = async (storedPath) => {
    for (const dir of SEARCH_DIRS) {
        const candidate = path.resolve(dir, storedPath);
        if (!candidate.startsWith(dir + path.sep)) continue;
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // try the next folder
        }
    }
    return null;
};

try {
    if (config.storage.driver !== 'r2') throw new Error('R2 is not configured: set R2_BUCKET and the other R2_* variables');
    const paths = new Set();
    for (const sql of REFERENCES) {
        for (const { p } of await sequelize.query(sql, { type: QueryTypes.SELECT })) paths.add(p);
    }
    console.log(`${paths.size} referenced files; uploading to R2 folder "${config.storage.r2.folder}"${dryRun ? ' (dry run)' : ''}`);

    const missing = [];
    let uploaded = 0;
    for (const storedPath of paths) {
        const local = await findLocal(storedPath);
        if (!local) {
            missing.push(storedPath);
            continue;
        }
        if (!dryRun) await storeBuffer(storedPath, await fs.readFile(local));
        uploaded += 1;
    }
    console.log(`Uploaded: ${uploaded}. Not found locally: ${missing.length}`);
    for (const storedPath of missing) console.log(`  missing: ${storedPath}`);
} catch (error) {
    console.error('Failed:', error.message);
    process.exitCode = 1;
} finally {
    await closeDatabase();
}
