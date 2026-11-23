const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

/** Environment variables whose values must never appear in a log line. */
const SECRET_VARIABLES = ['DEEPINFRA_API_KEY', 'GOOGLE_BOOKS_API_KEY', 'R2_SECRET_ACCESS_KEY', 'SECRET_KEY', 'DB_PASS'];
const MIN_SECRET_LENGTH = 6; // don't redact trivially short values (e.g. an empty dev password)
const BEARER_TOKEN = /Bearer\s+[\w.~+/-]+=*/gi;

/** Replaces secrets and bearer tokens in text (read lazily: .env may load after this module). */
export const redact = (text) => {
    let result = String(text).replace(BEARER_TOKEN, 'Bearer [redacted]');
    for (const name of SECRET_VARIABLES) {
        const secret = process.env[name];
        if (secret && secret.length >= MIN_SECRET_LENGTH) result = result.split(secret).join('[redacted]');
    }
    return result;
};

const redactMeta = (value) => {
    if (value instanceof Error) return redact(value.stack ?? `${value.name}: ${value.message}`);
    if (typeof value === 'string') return redact(value);
    return value;
};

const write = (level, consoleFn) => (message, ...meta) => {
    if (LEVELS[level] < threshold) return;
    consoleFn(`[${new Date().toISOString()}] ${level.toUpperCase()} ${redact(message)}`, ...meta.map(redactMeta));
};

/** Minimal levelled logger with secret redaction; swap for pino/winston for structured logs. */
const logger = Object.freeze({
    debug: write('debug', console.debug),
    info: write('info', console.info),
    warn: write('warn', console.warn),
    error: write('error', console.error),
});

export default logger;
