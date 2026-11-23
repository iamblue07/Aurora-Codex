import 'dotenv/config';

const DEFAULT_CORS_ORIGINS = [
    'http://localhost:5173',
    'https://web-app-for-readers-with-ai-recommendations-gec4i717i.vercel.app',
    'https://web-app-for-readers-with-ai-recomme.vercel.app',
    'https://web-app-for-readers-with-ai.vercel.app',
];

const required = (name) => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const optional = (name, fallback) => {
    const value = process.env[name]?.trim();
    return value ? value : fallback;
};

const toInt = (name, fallback) => {
    const raw = optional(name, undefined);
    if (raw === undefined) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
    }
    return parsed;
};

const toBool = (name, fallback) => {
    const raw = optional(name, undefined);
    if (raw === undefined) return fallback;
    return ['true', '1', 'yes'].includes(raw.toLowerCase());
};

const toNumber = (name, fallback) => {
    const raw = optional(name, undefined);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) throw new Error(`Environment variable ${name} must be a number, got "${raw}"`);
    return parsed;
};

const toList = (raw) => raw.split(',').map((item) => item.trim()).filter(Boolean);

const corsOrigins = new Set(toList(optional('CORS_ORIGINS', DEFAULT_CORS_ORIGINS.join(','))));
const frontendUrl = optional('FRONTEND_URL', undefined);
if (frontendUrl) corsOrigins.add(frontendUrl);

const nodeEnv = optional('NODE_ENV', 'development');

/** The API key travels in a header: only allow HTTPS (or a local endpoint for development). */
const aiBaseUrl = optional('DEEPINFRA_BASE_URL', 'https://api.deepinfra.com/v1/openai').replace(/\/+$/, '');
if (!/^https:\/\//.test(aiBaseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(aiBaseUrl)) {
    throw new Error('DEEPINFRA_BASE_URL must use https:// (the API key is sent with every request)');
}

/**
 * Centralised, validated application configuration.
 * Every other module should read settings from here instead of `process.env`.
 */
const keepAliveMin = toNumber('DB_KEEPALIVE_MIN_MINUTES', 2);
const keepAliveMax = toNumber('DB_KEEPALIVE_MAX_MINUTES', 4);
if (!(keepAliveMin > 0) || keepAliveMax < keepAliveMin) {
    throw new Error('DB_KEEPALIVE_MIN_MINUTES must be > 0 and not above DB_KEEPALIVE_MAX_MINUTES');
}

const config = Object.freeze({
    env: nodeEnv,
    port: toInt('PORT', 3000),

    db: Object.freeze({
        // DB_URL is kept for backwards compatibility with existing deployments.
        host: optional('DB_HOST', optional('DB_URL', 'localhost')),
        port: toInt('DB_PORT', 3306),
        name: required('DB_NAME'),
        user: required('DB_USER'),
        password: optional('DB_PASS', ''),
        /** Apply pending migrations when the server starts (handy on hosts without a shell). */
        migrateOnStart: toBool('DB_MIGRATE_ON_START', true),
        logging: toBool('DB_LOGGING', false),
        /**
         * TLS to the database, required by most hosted MySQL providers. The server certificate is
         * verified against the system CAs, or against DB_SSL_CA_FILE when the provider uses its own
         * CA (e.g. a Render "Secret File" at /etc/secrets/ca.pem).
         */
        ssl: Object.freeze({
            enabled: toBool('DB_SSL', false),
            caFile: optional('DB_SSL_CA_FILE', null),
        }),
        /** Periodic `SELECT 1` so free-tier databases don't suspend (see database/keep-alive.js). */
        keepAlive: Object.freeze({
            enabled: toBool('DB_KEEPALIVE', true),
            minMinutes: keepAliveMin,
            maxMinutes: keepAliveMax,
        }),
    }),

    auth: Object.freeze({
        secret: required('SECRET_KEY'),
        tokenTtl: optional('JWT_EXPIRES_IN', '1h'),
        bcryptRounds: 10,
    }),

    cors: Object.freeze({
        origins: Object.freeze([...corsOrigins]),
    }),

    googleBooks: Object.freeze({
        /** Optional: without a key Google applies a lower, shared quota. Never sent to clients. */
        apiKey: optional('GOOGLE_BOOKS_API_KEY', null),
    }),

    covers: Object.freeze({
        /** Hosts whose cover images may be proxied (HTTPS only; subdomains included). */
        allowedHosts: Object.freeze(toList(optional('COVER_IMAGE_HOSTS', 'dc5.ro')).map((h) => h.toLowerCase())),
    }),

    /**
     * AI provider (DeepInfra, OpenAI-compatible API) used for embeddings and emotion analysis.
     * Models and tuning live in the admin settings (app_settings); only secrets and endpoints
     * come from the environment. Without an API key the AI features are reported as disabled.
     */
    ai: Object.freeze({
        apiKey: optional('DEEPINFRA_API_KEY', null),
        baseUrl: aiBaseUrl,
        timeoutMs: toInt('AI_REQUEST_TIMEOUT_MS', 60_000),
    }),

});

export default config;
