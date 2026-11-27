import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import config from './config/env.js';
import { UPLOAD_FOLDERS, UPLOADS_ROOT } from './config/paths.js';
import { getDatabaseState } from './database/connection.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import apiRoutes from './routes/index.js';
import HttpError from './utils/http-error.js';

const corsOptions = {
    origin: (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server) are allowed.
        callback(null, !origin || config.cors.origins.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
};

/** While the server is still connecting to the database, API requests get a 503 to retry later. */
const requireDatabase = (_req, res, next) => {
    if (getDatabaseState() === 'ready') return next();
    res.set('Retry-After', '30');
    return next(HttpError.serviceUnavailable('The database is not available yet, try again shortly'));
};

/** Builds the Express application (no network listener: see server.js). */
export const createApp = () => {
    const app = express();

    app.disable('x-powered-by');
    // Behind Render/Vercel-style proxies, so rate limiting sees the real client IP.
    app.set('trust proxy', 1);

    // A JSON API never serves pages: the strictest CSP, no framing. Images are loaded cross-origin
    // by the React app, so cross-origin resource reads stay allowed.
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
            useDefaults: false,
            directives: { defaultSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"], frameAncestors: ["'none'"] },
        },
        referrerPolicy: { policy: 'no-referrer' },
    }));
    app.use(cors(corsOptions));
    // gzip JSON responses (statistics are ~90 KB raw); images are already compressed and skipped.
    app.use(compression());
    app.use(express.json({ limit: '100kb' }));

    // Always 200 while the process runs (the host must not restart it during a database outage);
    // `database` tells whether the API can serve requests.
    app.get('/health', (_req, res) => res.json({ status: 'ok', database: getDatabaseState() }));

    // Only public images are served statically; chat media goes through an authorised endpoint.
    // (With R2 storage, images are served by Cloudflare instead.)
    if (config.storage.driver === 'local') {
        app.use(
            `/uploads/${UPLOAD_FOLDERS.images}`,
            express.static(path.join(UPLOADS_ROOT, UPLOAD_FOLDERS.images), { maxAge: '7d', index: false }),
        );
    }

    app.use('/api', requireDatabase, apiRateLimiter, apiRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};

export default createApp;
