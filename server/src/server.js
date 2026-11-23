import http from 'node:http';
import createApp from './app.js';
import config from './config/env.js';
import { ensureDirectories } from './config/paths.js';
import { closeDatabase, connectDatabase } from './database/connection.js';
import { startDatabaseKeepAlive } from './database/keep-alive.js';
import { runMigrations } from './database/migrator.js';
import { warmUpSearchIndex } from './services/ai/ai-status.service.js';
import { cancelAllJobs, markInterruptedJobs } from './services/jobs/index.js';
import logger from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const start = async () => {
    ensureDirectories();
    await connectDatabase();
    if (config.db.migrateOnStart) await runMigrations();
    await markInterruptedJobs();

    const server = http.createServer(createApp());
    server.listen(config.port, () => {
        logger.info(`Server listening on port ${config.port} (${config.env})`);
        warmUpSearchIndex(); // background: requests are served meanwhile
    });
    const stopKeepAlive = startDatabaseKeepAlive();

    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down`);
        cancelAllJobs();
        stopKeepAlive();
        const forceExit = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
        forceExit.unref();
        server.close(async () => {
            await closeDatabase();
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
});

start().catch((error) => {
    logger.error('Failed to start the server:', error);
    process.exit(1);
});
