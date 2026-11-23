import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';
import logger from '../utils/logger.js';
import sequelize from './connection.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Versioned schema migrations (replaces `sequelize.sync()`).
 * Applied migrations are recorded in the `schema_migrations` table.
 */
export const migrator = new Umzug({
    migrations: {
        glob: ['*.js', { cwd: MIGRATIONS_DIR }],
        resolve: ({ name, path: filePath, context }) => ({
            name,
            up: async () => (await import(pathToFileURL(filePath).href)).up(context),
            down: async () => (await import(pathToFileURL(filePath).href)).down?.(context),
        }),
    },
    context: { queryInterface: sequelize.getQueryInterface(), sequelize, Sequelize },
    storage: new SequelizeStorage({ sequelize, tableName: 'schema_migrations' }),
    logger: {
        info: (event) => logger.info(`[migrations] ${event.event ?? ''} ${event.name ?? ''}`.trim()),
        warn: (event) => logger.warn('[migrations]', event),
        error: (event) => logger.error('[migrations]', event),
        debug: () => {},
    },
});

export const runMigrations = async () => {
    const applied = await migrator.up();
    if (applied.length === 0) logger.info('[migrations] database schema is up to date');
    return applied;
};
