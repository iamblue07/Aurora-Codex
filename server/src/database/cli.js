/**
 * Database command-line helper.
 *   node src/database/cli.js up        apply pending migrations
 *   node src/database/cli.js down      revert the last migration
 *   node src/database/cli.js status    list applied / pending migrations
 */
import logger from '../utils/logger.js';
import { closeDatabase } from './connection.js';
import { migrator } from './migrator.js';

const commands = {
    up: () => migrator.up(),
    down: () => migrator.down(),
    status: async () => {
        const [executed, pending] = await Promise.all([migrator.executed(), migrator.pending()]);
        logger.info(`Applied: ${executed.map((m) => m.name).join(', ') || '-'}`);
        logger.info(`Pending: ${pending.map((m) => m.name).join(', ') || '-'}`);
    },
};

const command = process.argv[2] ?? 'up';

try {
    if (!commands[command]) throw new Error(`Unknown command "${command}". Use: ${Object.keys(commands).join(', ')}`);
    await commands[command]();
} catch (error) {
    logger.error('Migration command failed:', error);
    process.exitCode = 1;
} finally {
    await closeDatabase();
}
