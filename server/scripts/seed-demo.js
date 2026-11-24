/**
 * Fills a catalogue database with a believable community for a proof-of-concept deployment:
 * 20 fictional readers + 1 administrator, their favourite genres and ratings, forum threads,
 * marketplace listings (with generated photos), conversations and moderation reports.
 *
 *   node scripts/seed-demo.js [--reset | --forums-only] [--credentials <file>]
 *
 * --forums-only replaces just the forum threads, posts, likes and forum reports of a database that
 * already has the demo users (passwords, listings and chats stay).
 * --bazaar-only fills in the marketplace details of the existing demo listings (author, condition,
 * city, delivery, reserved state, views) and replaces their favourites; photos and chats stay.
 *
 * Uses the database and uploads folder from .env (DB_NAME, UPLOADS_DIR). Refuses to run when
 * the database already has users, unless --reset is given: that deletes every user and
 * everything users created (the catalogue stays). Uploaded files are left on disk.
 * Passwords are generated and written to the credentials file (git-ignored *.local.txt).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { SERVER_ROOT, UPLOAD_FOLDERS, UPLOADS_ROOT, ensureDirectories, toStoredPath } from '../src/config/paths.js';
import config from '../src/config/env.js';
import sequelize, { closeDatabase, connectDatabase } from '../src/database/connection.js';
import {
    BOOK_REFS, DEMO_ADMIN, DEMO_CHATS, DEMO_FORUMS, DEMO_LISTINGS, DEMO_REPORTS, DEMO_USERS, SELLER_CITIES,
} from './seed/demo-content.js';
import { storeBuffer } from '../src/utils/files.js';
import { renderListingImage } from './seed/listing-image.js';
import { refreshForumStats } from '../src/services/forum.service.js';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const forumsOnly = args.includes('--forums-only');
const bazaarOnly = args.includes('--bazaar-only');
const credentialsIndex = args.indexOf('--credentials');
const credentialsFile = path.resolve(
    SERVER_ROOT,
    credentialsIndex >= 0 ? args[credentialsIndex + 1] : 'db/deploy/demo-accounts.local.txt',
);

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const now = Date.now();
const at = (msAgo) => new Date(Math.min(now - MINUTE, now - msAgo));

/** Small deterministic PRNG, so every run produces the same ratings and prices. */
const random = (() => {
    let state = 2026;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
})();
const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (weights) => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let roll = random() * total;
    for (const [value, weight] of Object.entries(weights)) {
        roll -= weight;
        if (roll < 0) return Number(value);
    }
    return Number(Object.keys(weights)[0]);
};
const RATING_WEIGHTS = { 5: 34, 4: 38, 3: 18, 2: 7, 1: 3 };

const generatePassword = (length) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(crypto.randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join('');
};
const emailFor = (name) => `${name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
const slug = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

const query = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const insert = (table, rows) => (rows.length ? sequelize.getQueryInterface().bulkInsert(table, rows) : null);

const USER_TABLES = [
    'reports', 'chat_messages', 'chats', 'listing_favorites', 'listing_images', 'listings', 'forum_messages', 'forums',
    'forum_message_likes', 'recommendations', 'read_books', 'favorite_genres', 'background_jobs', 'users',
];

const resetUsers = async () => {
    await sequelize.transaction(async (transaction) => {
        for (const table of USER_TABLES) await sequelize.query(`DELETE FROM \`${table}\``, { transaction });
    });
    // Restart ids at 1 (MySQL uses max(id) + 1, i.e. 1 for the now empty tables).
    for (const table of USER_TABLES) await sequelize.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
    console.log('Deleted every user and everything users created.');
};

/** Finds the best catalogue match (with cover and a store offer) for each referenced book. */
const resolveBooks = async () => {
    const books = {};
    for (const [key, { title, author }] of Object.entries(BOOK_REFS)) {
        const [book] = await query(
            `SELECT b.id, b.title, b.author, b.genre, MIN(o.price) AS lowestPrice
             FROM books b JOIN book_offers o ON o.book_id = b.id
             WHERE (b.title = :title OR b.title LIKE :prefix) AND b.author LIKE :author AND b.cover_image IS NOT NULL
             GROUP BY b.id
             ORDER BY b.title = :title DESC, CHAR_LENGTH(b.description) DESC, b.id ASC
             LIMIT 1`,
            { title, prefix: `${title} %`, author: `%${author}%` },
        );
        if (book) books[key] = { ...book, lowestPrice: Number(book.lowestPrice) };
        else console.warn(`  (book not in this catalogue, its content is skipped: ${title})`);
    }
    return books;
};

/**
 * Inserts the demo threads: category, linked book, pin, views, posts (with quoted replies) and
 * likes from other demo readers. Returns the post ids per thread (for reports).
 */
const seedForums = async (userId, books) => {
    const categories = Object.fromEntries((await query('SELECT id, slug FROM forum_categories')).map((row) => [row.slug, row.id]));
    const likers = Object.keys(userId).filter((username) => username !== DEMO_ADMIN.username);
    const forumMessageIds = [];
    const likes = [];

    for (const forum of DEMO_FORUMS) {
        const start = forum.daysAgo * DAY;
        await insert('forums', [{
            category_id: categories[forum.category] ?? categories['discutii-generale'],
            author_id: userId[forum.author],
            title: forum.title,
            book_id: forum.book ? books[forum.book]?.id ?? null : null,
            is_open: forum.isOpen ? 1 : 0,
            is_pinned: forum.isPinned ? 1 : 0,
            view_count: forum.views ?? randomInt(40, 300),
            created_at: at(start),
        }]);
        const [{ id: forumId }] = await query('SELECT MAX(id) AS id FROM forums');
        let elapsed = 0;
        await insert('forum_messages', forum.messages.map(([author, content, after = 0]) => {
            elapsed += after * MINUTE;
            return {
                forum_id: forumId, author_id: userId[author], content, is_removed: 0, created_at: at(start - elapsed),
            };
        }));
        const ids = (await query('SELECT id FROM forum_messages WHERE forum_id = :forumId ORDER BY id', { forumId }))
            .map((row) => row.id);
        forumMessageIds.push(ids);

        for (const [index, quoted] of Object.entries(forum.replies ?? {})) {
            await sequelize.query('UPDATE forum_messages SET reply_to_id = :quoted WHERE id = :id', {
                replacements: { quoted: ids[quoted], id: ids[index] },
            });
        }

        // Opening posts and longer answers collect more likes, as on a real board.
        forum.messages.forEach(([author, content], index) => {
            const base = index === 0 ? 4 : 1;
            const count = Math.min(likers.length - 1, randomInt(0, base + Math.floor(content.length / 160)));
            const pool = likers.filter((username) => username !== author);
            for (let i = 0; i < count && pool.length; i += 1) {
                const [liker] = pool.splice(randomInt(0, pool.length - 1), 1);
                const likedAt = at(start - (index + 1) * 60 * MINUTE);
                likes.push({ message_id: ids[index], user_id: userId[liker], created_at: likedAt });
            }
        });
    }
    await insert('forum_message_likes', likes);
    await refreshForumStats((await query('SELECT id FROM forums')).map((row) => row.id));
    return { forumMessageIds, likes: likes.length };
};

/** Moderation reports, resolved against the inserted posts and listings. */
const buildReports = (userId, { forumMessageIds, listingIds = [] }) => DEMO_REPORTS.map((report) => {
    const { forumMessage, listing } = report.target;
    const targetId = forumMessage ? forumMessageIds[forumMessage[0]]?.[forumMessage[1]] : listingIds[listing]?.id;
    if (!targetId) return null;
    return {
        reporter_id: userId[report.reporter],
        target_type: forumMessage ? 'forum_message' : 'listing',
        target_id: targetId,
        reason: report.reason,
        is_open: report.isOpen ? 1 : 0,
        created_at: at(report.daysAgo * DAY),
    };
}).filter(Boolean);

/** `--forums-only`: replaces the forum content of an already seeded database (users stay). */
const reseedForums = async () => {
    const userRows = await query('SELECT id, username FROM users');
    const userId = Object.fromEntries(userRows.map((row) => [row.username, row.id]));
    const missing = [DEMO_ADMIN, ...DEMO_USERS].filter((person) => !userId[person.username]);
    if (missing.length) throw new Error(`--forums-only needs the demo users; missing: ${missing.map((p) => p.username).join(', ')}`);

    await sequelize.query("DELETE FROM reports WHERE target_type IN ('forum', 'forum_message')");
    await sequelize.query('DELETE FROM forums');
    const books = await resolveBooks();
    const { forumMessageIds, likes } = await seedForums(userId, books);
    const reports = buildReports(userId, { forumMessageIds }).filter((report) => report.target_type === 'forum_message');
    await insert('reports', reports);
    console.log('Forums replaced:', { threads: DEMO_FORUMS.length, posts: forumMessageIds.flat().length, likes, reports: reports.length });
};

/**
 * Marketplace details of the demo listings (`seeded`: [{ id, listing, book }]): author, condition,
 * city, delivery, reserved state and views, plus favourites from other demo readers.
 */
const applyListingDetails = async (userId, seeded) => {
    const readers = DEMO_USERS.map((person) => person.username);
    let favorites = 0;
    for (const { id, listing, book } of seeded) {
        const sold = listing.soldAfterDays !== undefined;
        const fans = readers.filter((name) => name !== listing.seller && random() < (sold ? 0.12 : 0.2));
        await sequelize.query('DELETE FROM listing_favorites WHERE listing_id = ?', { replacements: [id] });
        await insert('listing_favorites', fans.map((name) => ({
            listing_id: id, user_id: userId[name], created_at: at(randomInt(0, listing.daysAgo) * DAY),
        })));
        favorites += fans.length;
        await sequelize.query(
            `UPDATE listings SET author = ?, book_condition = ?, city = ?, offers_pickup = 1, offers_shipping = ?,
                is_reserved = ?, view_count = ?, favorite_count = ? WHERE id = ?`,
            {
                replacements: [
                    book.author ?? null, listing.condition ?? 'good', SELLER_CITIES[listing.seller] ?? null,
                    listing.shipping ? 1 : 0, listing.reserved && !sold ? 1 : 0,
                    randomInt(8, 22) * Math.ceil(Math.sqrt(listing.daysAgo)), fans.length, id,
                ],
            },
        );
    }
    return favorites;
};

/** --bazaar-only: details for the demo listings already in the database (matched by seller and title). */
const updateBazaar = async () => {
    const userRows = await query('SELECT id, username FROM users');
    const userId = Object.fromEntries(userRows.map((row) => [row.username, row.id]));
    const books = await resolveBooks();
    const seeded = [];
    for (const listing of DEMO_LISTINGS) {
        const book = books[listing.book];
        const [row] = await query('SELECT id FROM listings WHERE seller_id = ? AND title = ?', [userId[listing.seller], listing.title]);
        if (row && book) seeded.push({ id: row.id, listing, book });
    }
    const favorites = await applyListingDetails(userId, seeded);
    console.log('Bazaar updated:', { listings: seeded.length, favorites });
};

const main = async () => {
    await connectDatabase();
    ensureDirectories();

    const [{ users }] = await query('SELECT COUNT(*) AS users FROM users');
    const [{ books: bookCount }] = await query('SELECT COUNT(*) AS books FROM books');
    if (bookCount === 0) throw new Error('The catalogue is empty: seed a database that has books.');
    if (forumsOnly) {
        await reseedForums();
        return;
    }
    if (bazaarOnly) {
        await updateBazaar();
        return;
    }
    if (users > 0 && !reset) throw new Error(`Database "${config.db.name}" already has ${users} users. Use --reset to replace them.`);
    if (reset) await resetUsers();

    const books = await resolveBooks();
    const demoPassword = generatePassword(14);
    const adminPassword = generatePassword(20);
    const [demoHash, adminHash] = await Promise.all([bcrypt.hash(demoPassword, 10), bcrypt.hash(adminPassword, 10)]);

    // --- Users and favourite genres ---------------------------------------------------------
    const people = [{ ...DEMO_ADMIN, isAdmin: true }, ...DEMO_USERS];
    await insert('users', people.map((person) => ({
        email: emailFor(person.name === DEMO_ADMIN.name ? 'admin aurora codex' : person.name),
        username: person.username,
        password_hash: person.isAdmin ? adminHash : demoHash,
        description: person.bio,
        avatar_path: null,
        is_admin: person.isAdmin ? 1 : 0,
        created_at: at(person.joinedDaysAgo * DAY - randomInt(0, 600) * MINUTE),
    })));
    const userRows = await query('SELECT id, username, email FROM users');
    const userId = Object.fromEntries(userRows.map((row) => [row.username, row.id]));

    await insert('favorite_genres', people.flatMap((person) => person.genres.map((genre, index) => ({
        user_id: userId[person.username], genre, position: index + 1,
    }))));

    // --- Listings (with generated photos) -----------------------------------------------------
    const listingIds = [];
    const ratingPairs = new Map(); // "user:book" -> rating
    const rate = (username, bookId, rating) => {
        const key = `${userId[username]}:${bookId}`;
        if (!ratingPairs.has(key)) ratingPairs.set(key, { user_id: userId[username], book_id: bookId, rating });
    };

    for (const [index, listing] of DEMO_LISTINGS.entries()) {
        const book = books[listing.book];
        if (!book) {
            listingIds.push(null);
            continue;
        }
        const image = await renderListingImage({ title: listing.title.split(' – ')[0], author: book.author });
        const filename = `demo-${String(index + 1).padStart(2, '0')}-${slug(listing.title)}.webp`;
        await storeBuffer(toStoredPath(UPLOAD_FOLDERS.images, filename), image);

        const price = Math.max(5, Math.round(book.lowestPrice * listing.priceFactor));
        const sold = listing.soldAfterDays !== undefined && listing.daysAgo - listing.soldAfterDays >= 0;
        await insert('listings', [{
            seller_id: userId[listing.seller],
            book_id: book.id,
            title: listing.title,
            description: listing.description,
            price,
            genre: book.genre ?? 'other',
            is_negotiable: listing.negotiable ? 1 : 0,
            is_available: sold ? 0 : 1,
            image_path: toStoredPath(UPLOAD_FOLDERS.images, filename),
            created_at: at(listing.daysAgo * DAY - randomInt(60, 900) * MINUTE),
        }]);
        const [{ id }] = await query('SELECT MAX(id) AS id FROM listings');
        await insert('listing_images', [{ listing_id: id, path: toStoredPath(UPLOAD_FOLDERS.images, filename), position: 0 }]);
        listingIds.push({ id, listing, book });
        rate(listing.seller, book.id, random() < 0.6 ? 5 : 4); // sellers liked what they sell
    }

    const listingFavorites = await applyListingDetails(userId, listingIds.filter(Boolean));

    // --- Forums and their messages --------------------------------------------------------------
    const { forumMessageIds, likes } = await seedForums(userId, books);

    // --- Conversations ---------------------------------------------------------------------------
    let chats = 0;
    for (const chat of DEMO_CHATS) {
        const target = listingIds[chat.listing];
        if (!target) continue;
        const start = (target.listing.daysAgo - chat.afterDays) * DAY - randomInt(60, 600) * MINUTE;
        const sellerId = userId[target.listing.seller];
        const buyerId = userId[chat.buyer];
        await insert('chats', [{
            listing_id: target.id,
            seller_id: sellerId,
            buyer_id: buyerId,
            is_open: chat.isOpen ? 1 : 0,
            created_at: at(start),
        }]);
        const [{ id: chatId }] = await query('SELECT MAX(id) AS id FROM chats');
        let elapsed = 0;
        await insert('chat_messages', chat.messages.map(([from, content, after = 0]) => {
            elapsed += after * MINUTE;
            const senderId = from === 'buyer' ? buyerId : sellerId;
            return { chat_id: chatId, sender_id: senderId, content, created_at: at(start - elapsed) };
        }));
        chats += 1;
    }

    // --- Reports -----------------------------------------------------------------------------------
    const reports = buildReports(userId, { forumMessageIds, listingIds });
    await insert('reports', reports);

    // --- Reading history: favourite genres plus a few discussed classics ---------------------------
    for (const [index, person] of DEMO_USERS.entries()) {
        if (person.genres.length === 0) continue;
        const picks = await query(
            `SELECT id FROM books
             WHERE genre IN (:genres) AND cover_image IS NOT NULL AND CHAR_LENGTH(description) > 200
             ORDER BY RAND(:seed) LIMIT :limit`,
            { genres: person.genres, seed: index + 11, limit: randomInt(10, 26) },
        );
        for (const { id } of picks) rate(person.username, id, pick(RATING_WEIGHTS));
    }
    for (const forum of DEMO_FORUMS) {
        for (const [author] of forum.messages) {
            if (author === DEMO_ADMIN.username || random() < 0.5) continue;
            const keys = Object.keys(books);
            rate(author, books[keys[randomInt(0, keys.length - 1)]].id, pick({ 5: 45, 4: 40, 3: 15 }));
        }
    }
    await insert('read_books', [...ratingPairs.values()]);

    // --- Credentials ---------------------------------------------------------------------------------
    fs.mkdirSync(path.dirname(credentialsFile), { recursive: true });
    const admin = userRows.find((row) => row.username === DEMO_ADMIN.username);
    fs.writeFileSync(credentialsFile, [
        `Demo accounts for database "${config.db.name}" (generated ${new Date().toISOString()}).`,
        'Keep this file private: it is git-ignored on purpose.',
        '',
        `Administrator: ${admin.email} / ${adminPassword}`,
        '',
        `Password of every demo reader below: ${demoPassword}`,
        ...userRows
            .filter((row) => row.username !== DEMO_ADMIN.username)
            .map((row) => `  ${row.username.padEnd(18)} ${row.email}`),
        '',
    ].join('\n'), { mode: 0o600 });

    const summary = {
        users: userRows.length,
        favoriteGenres: people.reduce((sum, p) => sum + p.genres.length, 0),
        ratings: ratingPairs.size,
        listings: listingIds.filter(Boolean).length,
        sold: listingIds.filter((l) => l && l.listing.soldAfterDays !== undefined).length,
        listingFavorites,
        forums: DEMO_FORUMS.length,
        forumMessages: forumMessageIds.flat().length,
        forumLikes: likes,
        chats,
        reports: reports.length,
    };
    console.log('Seeded:', summary);
    console.log(`Listing photos stored in: ${config.storage.driver === 'r2' ? `R2 (${config.storage.r2.folder}/images)` : path.join(UPLOADS_ROOT, UPLOAD_FOLDERS.images)}`);
    console.log(`Credentials written to ${path.relative(SERVER_ROOT, credentialsFile)}`);
};

try {
    await main();
} catch (error) {
    console.error('Seeding failed:', process.env.DEBUG_SEED ? error : error.message);
    process.exitCode = 1;
} finally {
    await closeDatabase();
}
