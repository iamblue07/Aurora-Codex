/**
 * Exports the configured database (DB_NAME from .env) to a UTF-8 SQL file with mysqldump,
 * e.g. to load the demo database on a hosting provider:
 *
 *   node scripts/export-db.js [--out db/deploy/<name>.sql] [--mysqldump <path to mysqldump>]
 *
 * The password is passed through the environment (MYSQL_PWD), never on the command line.
 * `--result-file` avoids shell redirection, which on Windows re-encodes the dump as UTF-16;
 * `--hex-blob` keeps the binary embedding vectors intact.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from '../src/config/paths.js';
import config from '../src/config/env.js';

const option = (name, fallback) => {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : fallback;
};

const outFile = path.resolve(SERVER_ROOT, option('out', `db/deploy/${config.db.name}.sql`));
const mysqldump = option('mysqldump', process.env.MYSQLDUMP ?? 'mysqldump');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

try {
    execFileSync(mysqldump, [
        `--host=${config.db.host}`,
        `--port=${config.db.port}`,
        `--user=${config.db.user}`,
        '--default-character-set=utf8mb4',
        '--single-transaction',
        '--no-tablespaces',
        '--hex-blob',
        '--set-gtid-purged=OFF',
        `--result-file=${outFile}`,
        config.db.name,
    ], { env: { ...process.env, MYSQL_PWD: config.db.password }, stdio: ['ignore', 'inherit', 'inherit'] });
    const sizeMb = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(1);
    console.log(`Exported "${config.db.name}" to ${path.relative(SERVER_ROOT, outFile)} (${sizeMb} MB)`);
} catch (error) {
    console.error(`Export failed: ${error.message}`);
    process.exitCode = 1;
}
