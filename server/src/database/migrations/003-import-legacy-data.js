/**
 * Copies the data of a legacy (Romanian) database, archived by 001-archive-legacy-schema, into the
 * new schema. IDs are preserved so existing links and uploaded file names keep working.
 *
 * Integrity is enforced while copying: rows pointing at missing users/books/listings are skipped
 * (or their optional reference is cleared), duplicates are collapsed, Romanian genre labels are
 * converted to genre codes and placeholder texts become NULL. 004-drop-legacy-tables then removes
 * the `legacy_*` tables.
 *
 * On a fresh database this migration does nothing.
 */
import { QueryTypes } from 'sequelize';
import { FALLBACK_GENRE, GENRES } from '../../constants/genres.js';
import logger from '../../utils/logger.js';
import { LEGACY_PREFIX } from './001-archive-legacy-schema.js';

/** Moderation marker the legacy app wrote into removed forum messages. */
const LEGACY_REMOVED_MARKER = '!!!MESAJ STERS DE CATRE ADMINISTRATOR!!!';

/** Placeholder texts the legacy scraper stored instead of NULL. */
const LEGACY_UNKNOWN_AUTHOR = 'Necunoscut';
const LEGACY_NO_DESCRIPTION = 'Fara descriere...';

const LEGACY_REPORT_TARGETS = Object.freeze({
    MesajChat: 'chat_message',
    MesajForum: 'forum_message',
    Forum: 'forum',
    Anunt: 'listing',
});

const tableExists = async (sequelize, name) => {
    const [rows] = await sequelize.query(
        'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        { replacements: [name] },
    );
    return rows.length > 0;
};

/** SQL expression mapping a legacy Romanian genre label onto a genre code. */
const genreCodeSql = (sequelize, column) => {
    const branches = GENRES
        .map(({ code, label }) => `WHEN ${sequelize.escape(label)} THEN ${sequelize.escape(code)}`)
        .join(' ');
    // The column collation is accent-insensitive, so "ADOLESCENTI" also matches "ADOLESCENȚI".
    return `(CASE UPPER(TRIM(${column})) ${branches} ELSE ${sequelize.escape(FALLBACK_GENRE)} END)`;
};

/** SQL expression converting legacy upload paths to paths relative to the new uploads folder. */
const uploadPathSql = (column) => `(CASE
    WHEN ${column} LIKE 'uploadsMessages/%' THEN CONCAT('chat-media/', SUBSTRING(${column}, 17))
    WHEN ${column} LIKE 'uploads/%' THEN CONCAT('images/', SUBSTRING(${column}, 9))
    ELSE ${column}
END)`;

const buildStatements = (sequelize) => {
    const L = (table) => `\`${LEGACY_PREFIX}${table}\``;
    const genre = (column) => genreCodeSql(sequelize, column);

    const favoriteGenreSelects = ['preferintaUnu', 'preferintaDoi', 'preferintaTrei', 'preferintaPatru', 'preferintaCinci']
        .map((column, index) => `
            SELECT p.idUtilizator AS user_id, ${genre(`p.${column}`)} AS genre, ${index + 1} AS position
            FROM ${L('preferintes')} p
            JOIN users u ON u.id = p.idUtilizator
            WHERE TRIM(COALESCE(p.${column}, '')) <> ''`)
        .join(' UNION ALL ');

    const reportTargetSql = `(CASE r.obiectRaport ${Object.entries(LEGACY_REPORT_TARGETS)
        .map(([legacy, target]) => `WHEN ${sequelize.escape(legacy)} THEN ${sequelize.escape(target)}`)
        .join(' ')} END)`;

    return [
        ['users', `
            INSERT INTO users (id, email, username, password_hash, description, avatar_path,
                can_create_listings, can_create_forums, can_send_messages, can_report, is_admin, created_at)
            SELECT id, email, username, parolaHash, descriere, ${uploadPathSql('caleImagineProfil')},
                COALESCE(poateCreaAnunt, 1), COALESCE(poateCreaForum, 1), COALESCE(poateTrimiteMesaj, 1),
                COALESCE(poateRaporta, 1), COALESCE(esteAdministrator, 0), dataInregistrare
            FROM ${L('utilizators')}`],

        // Duplicated preferences collapse onto the first position thanks to INSERT IGNORE + ORDER BY.
        ['favorite_genres', `
            INSERT IGNORE INTO favorite_genres (user_id, genre, position)
            SELECT user_id, genre, position FROM (${favoriteGenreSelects}) AS prefs
            ORDER BY user_id, position`],

        ['books', `
            INSERT INTO books (id, isbn, title, author, description, english_description, genre, cover_image,
                anger_score, disgust_score, fear_score, joy_score, sadness_score, surprise_score, neutral_score)
            SELECT id, NULLIF(TRIM(isbn), ''), titlu,
                NULLIF(NULLIF(TRIM(autor), ''), ${sequelize.escape(LEGACY_UNKNOWN_AUTHOR)}),
                NULLIF(NULLIF(TRIM(descriere), ''), ${sequelize.escape(LEGACY_NO_DESCRIPTION)}),
                english_description, ${genre('genLiterar')},
                ${uploadPathSql('caleImagine')},
                anger_score, disgust_score, fear_score, joy_score, sadness_score, surprise_score, neutral_score
            FROM ${L('cartes')}`],

        ['book_offers', `
            INSERT INTO book_offers (id, book_id, store, url, price)
            SELECT o.id, o.idCarte, o.magazin, o.linkOferta, COALESCE(o.pretOferta, 0)
            FROM ${L('ofertacartes')} o
            JOIN books b ON b.id = o.idCarte`],

        // Keep the most recent rating when a user rated the same book more than once.
        ['read_books', `
            INSERT IGNORE INTO read_books (id, user_id, book_id, rating)
            SELECT c.id, c.idUtilizator, c.idCarte, LEAST(GREATEST(c.scor, 0), 5)
            FROM ${L('cartecitita')} c
            JOIN users u ON u.id = c.idUtilizator
            JOIN books b ON b.id = c.idCarte
            ORDER BY c.id DESC`],

        ['recommendations', `
            INSERT INTO recommendations (id, user_id, book_id)
            SELECT r.id, r.idUtilizator, r.idCarte
            FROM ${L('recomandareais')} r
            JOIN users u ON u.id = r.idUtilizator
            JOIN books b ON b.id = r.idCarte`],

        ['listings', `
            INSERT INTO listings (id, seller_id, book_id, title, description, price, genre,
                is_negotiable, is_available, image_path, created_at)
            SELECT a.id, a.idUtilizator, b.id, a.titluAnunt, a.descriereAnunt, GREATEST(a.pretAnunt, 0),
                ${genre('a.genLiterar')}, COALESCE(a.esteNegociabil, 0), COALESCE(a.esteDisponibil, 1),
                ${uploadPathSql('a.caleImagine')}, a.dataAnunt
            FROM ${L('anuntbazars')} a
            JOIN users u ON u.id = a.idUtilizator
            LEFT JOIN books b ON b.id = a.idCarte`],

        ['chats', `
            INSERT IGNORE INTO chats (id, listing_id, seller_id, buyer_id, is_open, created_at)
            SELECT c.id, c.idAnunt, c.idVanzator, c.idCumparator, c.esteDeschis, c.data
            FROM ${L('chatbazars')} c
            JOIN listings l ON l.id = c.idAnunt
            JOIN users s ON s.id = c.idVanzator
            JOIN users b ON b.id = c.idCumparator
            ORDER BY c.id`],

        ['chat_messages', `
            INSERT INTO chat_messages (id, chat_id, sender_id, content, media_path, created_at)
            SELECT m.id, m.idChat, m.idUtilizator,
                CASE WHEN m.esteMedia THEN NULL ELSE m.continut END,
                CASE WHEN m.esteMedia THEN ${uploadPathSql('m.caleMedia')} ELSE NULL END,
                m.data
            FROM ${L('mesajchats')} m
            JOIN chats c ON c.id = m.idChat
            JOIN users u ON u.id = m.idUtilizator`],

        ['forums', `
            INSERT INTO forums (id, author_id, title, is_open, created_at)
            SELECT f.id, u.id, f.titluForum, COALESCE(f.esteDeschis, 1), f.data
            FROM ${L('forums')} f
            LEFT JOIN users u ON u.id = f.idUtilizator`],

        ['forum_messages', `
            INSERT INTO forum_messages (id, forum_id, author_id, content, is_removed, created_at)
            SELECT m.id, m.idForum, u.id, m.continut, m.continut = ${sequelize.escape(LEGACY_REMOVED_MARKER)}, m.data
            FROM ${L('mesajforums')} m
            JOIN forums f ON f.id = m.idForum
            LEFT JOIN users u ON u.id = m.idUtilizator`],

        ['reports', `
            INSERT INTO reports (id, reporter_id, target_type, target_id, reason, is_open, created_at)
            SELECT r.id, r.idRaportor, ${reportTargetSql}, r.idObiect, r.descriere, r.esteDeschis, r.dataRaport
            FROM ${L('raports')} r
            JOIN users u ON u.id = r.idRaportor
            WHERE ${reportTargetSql} IS NOT NULL`],
    ];
};

export const up = async ({ sequelize }) => {
    if (!await tableExists(sequelize, `${LEGACY_PREFIX}utilizators`)) return;

    const statements = buildStatements(sequelize);
    await sequelize.transaction(async (transaction) => {
        for (const [table, sql] of statements) {
            const [, affectedRows] = await sequelize.query(sql, { transaction, type: QueryTypes.INSERT });
            logger.info(`[migrations] imported ${affectedRows} legacy rows into ${table}`);
        }
    });
};

export const down = async ({ sequelize }) => {
    // Reverse dependency order; leaves the legacy_* tables intact.
    for (const table of ['reports', 'forum_messages', 'forums', 'chat_messages', 'chats', 'listings',
        'recommendations', 'read_books', 'book_offers', 'books', 'favorite_genres', 'users']) {
        await sequelize.query(`DELETE FROM \`${table}\``);
    }
};
