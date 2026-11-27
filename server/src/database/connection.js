import fs from 'node:fs';
import { AccessDeniedError, ConnectionError, Sequelize } from 'sequelize';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/** TLS options for hosted databases (never skips certificate verification). */
const sslOptions = () => {
    if (!config.db.ssl.enabled) return undefined;
    const ssl = { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
    if (config.db.ssl.caFile) ssl.ca = fs.readFileSync(config.db.ssl.caFile, 'utf8');
    return ssl;
};

/**
 * Could not open a connection (refused, timed out, reset during the handshake). Wrong credentials
 * are excluded: retrying them never helps. An arrow function on purpose: the retry library calls
 * functions without a prototype as predicates (a regular function would be used with instanceof).
 */
export const isTransientConnectionError = (error) => error instanceof ConnectionError
    && !(error instanceof AccessDeniedError);

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    dialectOptions: {
        // Return DECIMAL columns (prices) as JS numbers instead of strings.
        decimalNumbers: true,
        ssl: sslOptions(),
    },
    logging: config.db.logging ? (sql) => logger.debug(sql) : false,
    pool: { max: 10, min: 0, idle: 10_000, acquire: 30_000 },
    retry: {
        // A database that is waking up or briefly unreachable refuses or drops new connections:
        // retry those (twice, after 0.5 s and 1 s) instead of failing the request. Only failures to
        // connect are retried, never a query that was already sent, so no write can run twice.
        match: [isTransientConnectionError],
        max: 3,
        backoffBase: 500,
        backoffExponent: 2,
    },
    define: {
        // camelCase attributes in JS, snake_case columns in MySQL (e.g. sellerId -> seller_id).
        underscored: true,
        timestamps: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_0900_ai_ci',
    },
});

export const connectDatabase = async () => {
    await sequelize.authenticate();
    logger.info(`Connected to MySQL database "${config.db.name}" at ${config.db.host}:${config.db.port}`);
};

/**
 * Whether the API may use the database: 'ready' (the default, e.g. in tests and scripts), or
 * 'connecting' while the server starts or waits for an unreachable database. Requests to /api get
 * a 503 meanwhile instead of the process crashing (see server.js and app.js).
 */
let databaseState = 'ready';
export const getDatabaseState = () => databaseState;
export const setDatabaseState = (state) => { databaseState = state; };

/**
 * Connects, retrying forever with a growing pause (2 s, 4 s, … up to a minute) while the database
 * is down, so the server recovers by itself when it comes back. `shouldStop` ends the wait early
 * (shutdown). Resolves with the number of attempts, or null when stopped.
 */
export const waitForDatabase = async ({
    connect = connectDatabase,
    minDelayMs = 2_000,
    maxDelayMs = 60_000,
    shouldStop = () => false,
    sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms).unref?.(); }),
} = {}) => {
    for (let attempt = 1, delay = minDelayMs; ; attempt += 1, delay = Math.min(maxDelayMs, delay * 2)) {
        if (shouldStop()) return null;
        try {
            await connect();
            return attempt;
        } catch (error) {
            // Some network errors (e.g. both IPv4 and IPv6 refused) have an empty message: use the code.
            const reason = error.message || error.parent?.code || error.name;
            logger.warn(`Database unreachable (attempt ${attempt}): ${reason}. Retrying in ${Math.round(delay / 1000)} s`);
        }
        await sleep(delay);
    }
};

export const closeDatabase = () => sequelize.close();

export default sequelize;
