/**
 * Minimal Cloudflare R2 client (S3-compatible API, requests signed with aws4fetch).
 * Every object lives under the configured folder, e.g. `aurora-codex/images/<file>`.
 */
import { AwsClient } from 'aws4fetch';
import config from '../../config/env.js';

const { r2 } = config.storage;
let client = null;

const getClient = () => {
    if (!client) {
        if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
            throw new Error('R2 storage needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
        }
        client = new AwsClient({
            accessKeyId: r2.accessKeyId,
            secretAccessKey: r2.secretAccessKey,
            service: 's3',
            region: 'auto',
        });
    }
    return client;
};

/** Object key of a stored path such as `images/123.webp`. */
export const objectKey = (storedPath) => `${r2.folder}/${storedPath}`;

const objectUrl = (storedPath) => (
    `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucket}/${objectKey(storedPath).split('/').map(encodeURIComponent).join('/')}`
);

const send = async (method, storedPath, init = {}) => {
    const response = await getClient().fetch(objectUrl(storedPath), { method, ...init });
    if (!response.ok && !(method === 'DELETE' && response.status === 404)) {
        const detail = (await response.text().catch(() => '')).slice(0, 200);
        throw new Error(`R2 ${method} ${objectKey(storedPath)} failed with ${response.status}: ${detail}`);
    }
    return response;
};

export const putObject = (storedPath, body, { contentType, cacheControl }) => send('PUT', storedPath, {
    body,
    headers: { 'Content-Type': contentType, ...(cacheControl && { 'Cache-Control': cacheControl }) },
});

export const deleteObject = (storedPath) => send('DELETE', storedPath);

/** @returns {Promise<Response | null>} null when the object doesn't exist */
export const getObject = async (storedPath) => {
    const response = await getClient().fetch(objectUrl(storedPath), { method: 'GET' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`R2 GET ${objectKey(storedPath)} failed with ${response.status}`);
    return response;
};

/** Public URL of an object (bucket exposed via an r2.dev subdomain or a custom domain). */
export const publicObjectUrl = (storedPath) => `${r2.publicUrl}/${objectKey(storedPath)}`;
