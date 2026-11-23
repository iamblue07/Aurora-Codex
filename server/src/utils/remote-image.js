/**
 * Safe proxying of remote cover images (the bookstore CDN sends no CORS headers).
 *
 * The URL comes from the database, but the server must still never be turned into a generic
 * fetcher (SSRF): only HTTPS URLs on an allowlist of hosts are fetched (redirects too, each hop
 * re-checked), only raster image types are relayed (SVG can carry scripts) and the size is capped.
 */
import { Readable, Transform } from 'node:stream';
import config from '../config/env.js';
import HttpError from './http-error.js';

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const CACHE_SECONDS = 24 * 60 * 60;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

/** Whether `url` may be fetched: HTTPS on an allowed host (exact match or a subdomain of it). */
export const isAllowedImageUrl = (url, allowedHosts = config.covers.allowedHosts) => {
    let parsed;
    try {
        parsed = url instanceof URL ? url : new URL(url);
    } catch {
        return false;
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

/** Counts bytes and fails the stream once more than `limit` went through. */
const byteLimit = (limit) => {
    let seen = 0;
    return new Transform({
        transform(chunk, _encoding, callback) {
            seen += chunk.length;
            callback(seen > limit ? new Error('Image too large') : null, chunk);
        },
    });
};

/** Streams an allowed remote image to `res`, or throws an HttpError. */
export const proxyRemoteImage = async (res, url) => {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    let target = url instanceof URL ? url : new URL(url);
    let response;
    for (let hop = 0; ; hop += 1) {
        if (!isAllowedImageUrl(target)) throw HttpError.notFound('Image unavailable');
        try {
            response = await fetch(target, { redirect: 'manual', signal });
        } catch {
            throw HttpError.badGateway('Could not download the image');
        }
        const location = response.headers.get('location');
        if (response.status < 300 || response.status >= 400 || !location) break;
        await response.body?.cancel().catch(() => {});
        if (hop >= MAX_REDIRECTS) throw HttpError.notFound('Image unavailable');
        target = new URL(location, target); // the next hop is validated at the top of the loop
    }

    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const declaredSize = Number(response.headers.get('content-length'));
    if (response.status !== 200 || !response.body || !ALLOWED_TYPES.has(contentType)
        || (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES)) {
        await response.body?.cancel().catch(() => {});
        throw HttpError.notFound('Image unavailable');
    }

    res.set({ 'Content-Type': contentType, 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
    // If the upstream connection drops or the size cap is hit mid-transfer, abort our response.
    Readable.fromWeb(response.body)
        .on('error', () => res.destroy())
        .pipe(byteLimit(MAX_IMAGE_BYTES))
        .on('error', () => res.destroy())
        .pipe(res);
};
