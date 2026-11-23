/**
 * End-to-end API tests against a real MySQL database.
 *
 * Opt-in: set TEST_DB_NAME (must end with "_test") and run `npm run test:integration`.
 * The database is dropped and recreated from the migrations, the app runs in-process on a random
 * port and uploads go to a temporary folder, so nothing outside the test database is touched.
 * Connection settings (DB_HOST/DB_PORT/DB_USER/DB_PASS) come from the environment or .env.
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import mysql from 'mysql2/promise';

const TEST_DB = process.env.TEST_DB_NAME;
const skip = !TEST_DB ? 'TEST_DB_NAME is not set' : false;
if (TEST_DB && !TEST_DB.endsWith('_test')) {
    throw new Error('TEST_DB_NAME must end with "_test": the database is dropped by these tests');
}

// A valid 1x1 PNG, enough for the upload endpoints.
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
);

let baseUrl;
let server;
let uploadsDir;
let closeDatabase;
let User;

const adminConnection = () => mysql.createConnection({
    host: process.env.DB_HOST || process.env.DB_URL || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
});

/** Minimal HTTP client: JSON bodies by default, FormData when `form` is given. */
const api = async (method, url, { token, body, form } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) {
        payload = form;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }
    const response = await fetch(baseUrl + url, { method, headers, body: payload });
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    return { status: response.status, body: isJson ? await response.json() : null };
};

const imageForm = (field, fields = {}) => {
    const form = new FormData();
    form.append(field, new Blob([PNG], { type: 'image/png' }), 'image.png');
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
    return form;
};

const register = async (name) => {
    const { status, body } = await api('POST', '/api/auth/register', {
        body: { email: `${name}@example.test`, username: name, password: 'password123' },
    });
    assert.equal(status, 201);
    return { token: body.token, id: body.user.id };
};

describe('REST API', { skip }, () => {
    const state = {};

    before(async () => {
        uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readers-uploads-'));
        Object.assign(process.env, {
            DB_NAME: TEST_DB,
            UPLOADS_DIR: uploadsDir,
            LOG_LEVEL: 'error',
            // Never call the real AI provider from tests, even when .env holds a key.
            DEEPINFRA_API_KEY: '',
        });

        const connection = await adminConnection();
        await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
        await connection.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
        await connection.end();

        // Import after the environment is prepared: config is read at import time.
        const { createApp } = await import('../../src/app.js');
        const { ensureDirectories } = await import('../../src/config/paths.js');
        const database = await import('../../src/database/connection.js');
        const { runMigrations } = await import('../../src/database/migrator.js');
        const models = await import('../../src/models/index.js');
        closeDatabase = database.closeDatabase;
        User = models.User;

        ensureDirectories();
        await runMigrations();

        const book = await models.Book.create({ title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593', genre: 'fiction' });
        await models.BookOffer.create({ bookId: book.id, store: 'Carturesti', url: 'https://example.test/dune', price: 49.9 });
        state.bookId = book.id;

        server = createApp().listen(0);
        await new Promise((resolve) => { server.once('listening', resolve); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        await new Promise((resolve) => { server?.close(resolve); });
        await closeDatabase?.();
        const connection = await adminConnection();
        await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
        await connection.end();
        fs.rmSync(uploadsDir, { recursive: true, force: true });
    });

    describe('infrastructure', () => {
        it('reports health and lists genres with Romanian labels', async () => {
            assert.equal((await api('GET', '/health')).status, 200);
            const { body } = await api('GET', '/api/genres');
            assert.deepEqual(body.find((g) => g.code === 'fiction'), { code: 'fiction', label: 'FICTIUNE' });
        });

        it('answers unknown routes and malformed input with English JSON errors', async () => {
            const missing = await api('GET', '/api/nope');
            assert.equal(missing.status, 404);
            assert.match(missing.body.error, /not found/);

            const badId = await api('GET', '/api/books/abc');
            assert.equal(badId.status, 400);
            assert.equal(badId.body.error, 'bookId must be a positive integer');
        });
    });

    describe('authentication', () => {
        it('registers users and rejects invalid or duplicate registrations', async () => {
            Object.assign(state, {
                alice: await register('alice'),
                bob: await register('bob'),
                carol: await register('carol'),
            });
            const invalid = await api('POST', '/api/auth/register', { body: { email: 'x', username: 'y', password: '1' } });
            assert.equal(invalid.status, 400);
            const duplicate = await api('POST', '/api/auth/register', {
                body: { email: 'alice@example.test', username: 'alice2', password: 'password123' },
            });
            assert.equal(duplicate.status, 409);
        });

        it('logs in case-insensitively and never leaks the password hash', async () => {
            const wrong = await api('POST', '/api/auth/login', { body: { email: 'alice@example.test', password: 'nope-nope' } });
            assert.equal(wrong.status, 401);

            const { status, body } = await api('POST', '/api/auth/login', {
                body: { email: 'ALICE@example.test', password: 'password123' },
            });
            assert.equal(status, 200);
            assert.ok(body.token);
            assert.equal(JSON.stringify(body).includes('passwordHash'), false);
        });

        it('logs in accounts created before the email format rule, comparing passwords untrimmed', async () => {
            // Imported legacy accounts may have addresses like "name@test" and passwords with spaces.
            const { default: bcrypt } = await import('bcryptjs');
            await User.create({
                email: 'legacy@test',
                username: 'legacy-user',
                passwordHash: await bcrypt.hash(' old secret ', 10),
            });
            const login = (password) => api('POST', '/api/auth/login', { body: { email: 'Legacy@test', password } });
            assert.equal((await login(' old secret ')).status, 200);
            assert.equal((await login('old secret')).status, 401);
            assert.equal((await api('POST', '/api/auth/login', { body: { email: '', password: 'x' } })).status, 400);
        });

        it('renews a valid session and refuses an invalid one', async () => {
            const renewed = await api('POST', '/api/auth/refresh', { token: state.alice.token });
            assert.equal(renewed.status, 200);
            assert.ok(renewed.body.token);
            assert.equal(renewed.body.user.username, 'alice');
            assert.equal((await api('POST', '/api/auth/refresh', { token: 'not-a-token' })).status, 401);
        });

        it('reports email/username availability', async () => {
            const { body } = await api('POST', '/api/auth/availability', { body: { email: 'alice@example.test', username: 'free' } });
            assert.deepEqual(body, { emailAvailable: false, usernameAvailable: true });
        });

        it('protects private routes', async () => {
            assert.equal((await api('GET', '/api/me')).status, 401);
            assert.equal((await api('GET', '/api/me', { token: 'garbage' })).status, 401);
        });
    });

    describe('account', () => {
        it('updates the profile, password, avatar and favourite genres', async () => {
            const { token } = state.alice;
            assert.equal((await api('PATCH', '/api/me', { token, body: { description: 'Iubesc cărțile' } })).body.description, 'Iubesc cărțile');

            const wrongPassword = await api('PUT', '/api/me/password', {
                token, body: { currentPassword: 'nope', newPassword: 'password456' },
            });
            assert.equal(wrongPassword.status, 401);
            assert.equal((await api('PUT', '/api/me/password', {
                token, body: { currentPassword: 'password123', newPassword: 'password456' },
            })).status, 204);

            const avatar = await api('PUT', '/api/me/avatar', { token, form: imageForm('image') });
            // Uploaded photos are re-encoded as compressed WebP on the server.
            assert.match(avatar.body.avatarUrl, /^\/uploads\/images\/.+\.webp$/);
            assert.equal((await api('GET', avatar.body.avatarUrl)).status, 200);

            const genres = await api('PUT', '/api/me/favorite-genres', { token, body: { genres: ['history', 'fiction'] } });
            assert.deepEqual(genres.body.genres.map((g) => g.code), ['history', 'fiction']);
            assert.equal((await api('PUT', '/api/me/favorite-genres', { token, body: { genres: ['nope'] } })).status, 400);
        });
    });

    describe('catalogue', () => {
        it('searches books with filters', async () => {
            const { body } = await api('GET', '/api/books?search=dun&genres=fiction&minPrice=10&maxPrice=60&sort=price_asc');
            assert.equal(body.total, 1);
            assert.equal(body.items[0].lowestPrice, 49.9);
            assert.equal((await api('GET', '/api/books?maxPrice=10')).body.total, 0);
            assert.equal((await api('GET', '/api/books?genres=nope')).status, 400);
        });

        it('treats LIKE wildcards in search input literally', async () => {
            assert.equal((await api('GET', '/api/books?search=%25')).body.total, 0);
        });

        it('rates, reads back and removes a rating', async () => {
            const { token } = state.alice;
            const url = `/api/books/${state.bookId}/rating`;
            assert.equal((await api('PUT', url, { token, body: { rating: 9 } })).status, 400);
            assert.deepEqual((await api('PUT', url, { token, body: { rating: 5 } })).body, { isRead: true, rating: 5 });
            assert.deepEqual((await api('PUT', url, { token, body: { rating: 4 } })).body, { isRead: true, rating: 4 });
            assert.equal((await api('GET', '/api/me/reading-history', { token })).body.length, 1);
            assert.equal((await api('DELETE', url, { token })).status, 204);
            assert.deepEqual((await api('GET', url, { token })).body, { isRead: false, rating: null });
        });

        it('reports recommendations as unavailable without an AI key, within a per-user budget', async () => {
            assert.deepEqual((await api('GET', '/api/features')).body, { recommendations: false });
            // 10 requests per 15 minutes per user reach the handler (503 here: no key); the 11th is refused.
            for (let i = 0; i < 9; i += 1) await api('POST', '/api/me/recommendations', { token: state.carol.token });
            assert.equal((await api('POST', '/api/me/recommendations', { token: state.carol.token })).status, 503);
            const limited = await api('POST', '/api/me/recommendations', { token: state.carol.token });
            assert.equal(limited.status, 429);
            assert.equal((await api('POST', '/api/me/recommendations', { token: state.alice.token })).status, 503);
        });
    });

    describe('marketplace and chats', () => {
        it('creates listings with validation and ownership rules', async () => {
            const { token } = state.alice;
            const invalid = await api('POST', '/api/listings', {
                token, form: imageForm('image', { title: 'Dune', description: 'Ca nouă', price: -1, genre: 'fiction' }),
            });
            assert.equal(invalid.status, 400);

            const created = await api('POST', '/api/listings', {
                token,
                form: imageForm('image', {
                    title: 'Dune', description: 'Ca nouă', price: 25.5, genre: 'fiction', isNegotiable: true, bookId: state.bookId,
                }),
            });
            assert.equal(created.status, 201);
            assert.equal(created.body.isOwner, true);
            state.listing = created.body;

            assert.equal((await api('PATCH', `/api/listings/${state.listing.id}`, { token: state.bob.token, body: { price: 1 } })).status, 403);
            assert.equal((await api('PATCH', `/api/listings/${state.listing.id}`, { token, body: { price: 20 } })).body.price, 20);
            assert.equal((await api('GET', `/api/listings/${state.listing.id}`)).body.isOwner, false);
        });

        it('lets a buyer start exactly one chat, never with themselves', async () => {
            const url = `/api/listings/${state.listing.id}/chats`;
            assert.equal((await api('POST', url, { token: state.alice.token, body: { message: 'hi' } })).status, 400);
            const chat = await api('POST', url, { token: state.bob.token, body: { message: 'Bună! Mai e disponibilă?' } });
            assert.equal(chat.status, 201);
            assert.equal((await api('POST', url, { token: state.bob.token, body: { message: 'again' } })).status, 409);
            state.chatId = chat.body.id;
        });

        it('keeps chats and their media private to participants', async () => {
            const { chatId } = state;
            await api('POST', `/api/chats/${chatId}/messages`, { token: state.alice.token, body: { content: 'Da.' } });
            const media = await api('POST', `/api/chats/${chatId}/media`, { token: state.bob.token, form: imageForm('file') });
            assert.equal(media.status, 201);
            state.mediaMessage = media.body;

            const messages = await api('GET', `/api/chats/${chatId}/messages`, { token: state.alice.token });
            assert.equal(messages.body.length, 3);
            assert.equal((await api('GET', media.body.mediaUrl, { token: state.alice.token })).status, 200);

            assert.equal((await api('GET', `/api/chats/${chatId}/messages`, { token: state.carol.token })).status, 403);
            assert.equal((await api('GET', media.body.mediaUrl, { token: state.carol.token })).status, 403);
            assert.equal((await api('GET', media.body.mediaUrl)).status, 401);
        });

        it('only lets the buyer close a chat, and blocks messages once closed', async () => {
            const url = `/api/chats/${state.chatId}`;
            assert.equal((await api('PATCH', url, { token: state.alice.token, body: { isOpen: false } })).status, 403);
            assert.equal((await api('PATCH', url, { token: state.bob.token, body: { isOpen: false } })).body.isOpen, false);
            const blocked = await api('POST', `${url}/messages`, { token: state.alice.token, body: { content: 'x' } });
            assert.equal(blocked.status, 403);
        });

        it('lets only participants report chat messages', async () => {
            const report = (token) => api('POST', '/api/reports', {
                token, body: { targetType: 'chat_message', targetId: state.mediaMessage.id, reason: 'Spam' },
            });
            assert.equal((await report(state.carol.token)).status, 404);
            assert.equal((await report(state.alice.token)).status, 201);
        });
    });

    describe('forums', () => {
        it('creates forums, posts messages and enforces ownership and open status', async () => {
            const forum = await api('POST', '/api/forums', { token: state.alice.token, body: { title: 'Ce citiți acum?' } });
            assert.equal(forum.status, 201);
            state.forumId = forum.body.id;

            const message = await api('POST', `/api/forums/${state.forumId}/messages`, {
                token: state.bob.token, body: { content: 'Dune!' },
            });
            assert.equal(message.status, 201);
            state.forumMessageId = message.body.id;

            const hijack = await api('PATCH', `/api/forums/${state.forumId}`, { token: state.bob.token, body: { title: 'mine' } });
            assert.equal(hijack.status, 403);
            await api('PATCH', `/api/forums/${state.forumId}`, { token: state.alice.token, body: { isOpen: false } });
            const closed = await api('POST', `/api/forums/${state.forumId}/messages`, { token: state.bob.token, body: { content: 'x' } });
            assert.equal(closed.status, 403);
        });
    });

    describe('moderation', () => {
        before(async () => {
            await User.update({ isAdmin: true }, { where: { id: state.alice.id } });
        });

        it('restricts report management to administrators', async () => {
            assert.equal((await api('GET', '/api/reports', { token: state.bob.token })).status, 403);
            const reports = await api('GET', '/api/reports?status=open', { token: state.alice.token });
            assert.equal(reports.body.total, 1);

            const details = await api('GET', `/api/reports/${reports.body.items[0].id}`, { token: state.alice.token });
            assert.equal(details.body.targetAuthor.username, 'bob');
            assert.equal(details.body.targetAuthor.avatarUrl, null); // user references carry the avatar
            assert.match(details.body.target.mediaUrl, /\/media$/);
            assert.equal(details.body.target.mediaPath, undefined);
        });

        it('hides removed forum messages', async () => {
            const { token } = state.alice;
            assert.equal((await api('DELETE', `/api/admin/forum-messages/${state.forumMessageId}`, { token })).status, 204);
            const { body } = await api('GET', `/api/forums/${state.forumId}/messages`);
            assert.deepEqual([body.items[0].isRemoved, body.items[0].content], [true, null]);
        });

        it('revokes permissions and the revocation takes effect immediately', async () => {
            const url = `/api/admin/users/${state.bob.id}/permissions/sendMessages`;
            assert.equal((await api('PUT', url, { token: state.alice.token, body: { granted: false } })).status, 200);
            const forum = await api('POST', '/api/forums', { token: state.carol.token, body: { title: 'Open forum' } });
            const post = await api('POST', `/api/forums/${forum.body.id}/messages`, { token: state.bob.token, body: { content: 'x' } });
            assert.equal(post.status, 403);
        });

        it('shows the AI status to administrators only', async () => {
            assert.equal((await api('GET', '/api/admin/ai', { token: state.bob.token })).status, 403);
            const { status, body } = await api('GET', '/api/admin/ai', { token: state.alice.token });
            assert.equal(status, 200);
            assert.equal(body.provider.configured, false);
            assert.equal(body.embeddings.embeddedBooks, 0);
            assert.ok(body.catalogue.totalBooks >= 1);
        });

        it('validates, saves and resets settings', async () => {
            const { token } = state.alice;
            const initial = await api('GET', '/api/admin/settings', { token });
            assert.equal(initial.body.values['recommendations.resultCount'], 16);
            assert.ok(initial.body.definitions.some((definition) => definition.key === 'embeddings.model'));

            const invalid = await api('PATCH', '/api/admin/settings', { token, body: { 'recommendations.resultCount': 500 } });
            assert.equal(invalid.status, 400);
            assert.equal((await api('PATCH', '/api/admin/settings', { token, body: { unknown: 1 } })).status, 400);

            const saved = await api('PATCH', '/api/admin/settings', { token, body: { 'recommendations.resultCount': 8 } });
            assert.equal(saved.body.values['recommendations.resultCount'], 8);
            const reset = await api('PATCH', '/api/admin/settings', { token, body: { 'recommendations.resultCount': null } });
            assert.equal(reset.body.values['recommendations.resultCount'], 16);
        });

        it('refuses AI jobs without a key and unknown job types', async () => {
            const { token } = state.alice;
            assert.equal((await api('POST', '/api/admin/jobs', { token, body: { type: 'embeddings' } })).status, 503);
            assert.equal((await api('POST', '/api/admin/jobs', { token, body: { type: 'mining' } })).status, 400);
            const badScope = await api('POST', '/api/admin/jobs', { token, body: { type: 'embeddings', params: { scope: 'x' } } });
            assert.equal(badScope.status, 400);
        });

        it('runs, reports, refuses duplicates and cancels background jobs', async () => {
            const { token } = state.alice;
            // Stand-in for the emotion job: no network, controllable duration.
            const { registerJob } = await import('../../src/services/jobs/index.js');
            registerJob('emotions', {
                parseParams: (raw) => ({ steps: Number(raw.steps ?? 3), delayMs: Number(raw.delayMs ?? 5) }),
                async run({ steps, delayMs }, { signal, setTotal, advance, note }) {
                    setTotal(steps);
                    for (let i = 0; i < steps && !signal.aborted; i += 1) {
                        await new Promise((resolve) => { setTimeout(resolve, delayMs); });
                        advance({ processed: 1 });
                        note(`step ${i + 1}`);
                    }
                    return { steps };
                },
            });
            const waitFor = async (jobId, statusWanted) => {
                for (let attempt = 0; attempt < 100; attempt += 1) {
                    const { body } = await api('GET', `/api/admin/jobs/${jobId}`, { token });
                    if (body.status === statusWanted) return body;
                    await new Promise((resolve) => { setTimeout(resolve, 20); });
                }
                throw new Error(`job ${jobId} never reached ${statusWanted}`);
            };

            const started = await api('POST', '/api/admin/jobs', { token, body: { type: 'emotions', params: { steps: 3 } } });
            assert.equal(started.status, 202);
            const done = await waitFor(started.body.id, 'completed');
            assert.deepEqual([done.total, done.processed, done.result], [3, 3, { steps: 3 }]);
            assert.equal(done.startedBy.username, 'alice');

            const slow = await api('POST', '/api/admin/jobs', {
                token, body: { type: 'emotions', params: { steps: 1000, delayMs: 20 } },
            });
            assert.equal((await api('POST', '/api/admin/jobs', { token, body: { type: 'emotions' } })).status, 409);
            assert.equal((await api('POST', `/api/admin/jobs/${slow.body.id}/cancel`, { token })).status, 202);
            const cancelled = await waitFor(slow.body.id, 'cancelled');
            assert.ok(cancelled.processed < 1000);
            assert.equal((await api('POST', `/api/admin/jobs/${slow.body.id}/cancel`, { token })).status, 409);

            const history = await api('GET', '/api/admin/jobs?type=emotions', { token });
            assert.deepEqual(history.body.map((job) => job.status), ['cancelled', 'completed']);
        });

        it('deletes a listing together with its chats and uploaded files', async () => {
            const chatMediaDir = path.join(uploadsDir, 'chat-media');
            assert.equal(fs.readdirSync(chatMediaDir).length, 1);

            assert.equal((await api('DELETE', `/api/listings/${state.listing.id}`, { token: state.alice.token })).status, 204);
            assert.equal((await api('GET', `/api/chats/${state.chatId}`, { token: state.bob.token })).status, 404);
            assert.equal(fs.readdirSync(chatMediaDir).length, 0);
            assert.equal((await api('GET', state.listing.imageUrl)).status, 404);
        });
    });
});
