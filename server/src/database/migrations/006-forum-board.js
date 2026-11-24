/**
 * Turns the flat forum list into a board:
 *  - forum_categories, each thread (`forums` row) in one category;
 *  - threads can be pinned, link a catalogue book and count their views;
 *  - post count and last activity are stored on the thread (kept up to date by the service),
 *    so thread lists sort by activity without aggregating every message;
 *  - posts can answer another post, record when they were edited, and be liked.
 */

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

/** Board sections (names and descriptions are shown to users, so they are Romanian). */
export const DEFAULT_CATEGORIES = [
    ['discutii-generale', 'Discuții generale', 'Orice subiect despre cărți, lectură și obiceiurile de cititor.', 'messages-square'],
    ['recomandari', 'Recomandări', 'Cauți următoarea carte? Cere sau oferă recomandări.', 'sparkles'],
    ['cluburi-de-carte', 'Cluburi de carte', 'Lecturi comune, întâlniri și discuții pe capitole.', 'users'],
    ['autori-si-opere', 'Autori și opere', 'Analize, interpretări și dezbateri despre cărți și autori.', 'book-open'],
    ['pe-genuri', 'Pe genuri', 'SF, fantasy, thriller, poezie, dezvoltare personală… fiecare cu fanii lui.', 'library'],
    ['bazar-si-schimburi', 'Bazar și schimburi', 'Sfaturi pentru vânzări, schimburi de cărți și târguri.', 'store'],
    ['comunitate', 'Comunitate și anunțuri', 'Noutăți despre Aurora Codex, regulament, feedback și ajutor.', 'megaphone'],
];

export const up = async ({ sequelize }) => {
    await sequelize.query(`CREATE TABLE forum_categories (
        id INT NOT NULL AUTO_INCREMENT,
        slug VARCHAR(64) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NOT NULL,
        icon VARCHAR(32) NOT NULL,
        position SMALLINT NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uq_forum_categories_slug (slug)
    ) ${TABLE_OPTIONS}`);

    for (const [index, [slug, name, description, icon]] of DEFAULT_CATEGORIES.entries()) {
        await sequelize.query(
            'INSERT INTO forum_categories (slug, name, description, icon, position) VALUES (?, ?, ?, ?, ?)',
            { replacements: [slug, name, description, icon, index + 1] },
        );
    }
    const [[general]] = await sequelize.query("SELECT id FROM forum_categories WHERE slug = 'discutii-generale'");

    await sequelize.query(`ALTER TABLE forums
        ADD COLUMN category_id INT NOT NULL DEFAULT ${general.id} AFTER id,
        ADD COLUMN book_id INT NULL AFTER title,
        ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_open,
        ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER is_pinned,
        ADD COLUMN message_count INT NOT NULL DEFAULT 0 AFTER view_count,
        ADD COLUMN last_message_at DATETIME NULL AFTER message_count,
        ADD COLUMN last_message_author_id INT NULL AFTER last_message_at,
        ADD KEY idx_forums_board (category_id, is_pinned, last_message_at),
        ADD KEY idx_forums_activity (last_message_at),
        ADD CONSTRAINT fk_forums_category FOREIGN KEY (category_id) REFERENCES forum_categories (id),
        ADD CONSTRAINT fk_forums_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_forums_last_author FOREIGN KEY (last_message_author_id) REFERENCES users (id) ON DELETE SET NULL`);

    await sequelize.query(`ALTER TABLE forum_messages
        ADD COLUMN reply_to_id INT NULL AFTER author_id,
        ADD COLUMN edited_at DATETIME NULL AFTER is_removed,
        ADD KEY idx_forum_messages_thread (forum_id, created_at, id),
        ADD CONSTRAINT fk_forum_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES forum_messages (id) ON DELETE SET NULL`);

    await sequelize.query(`CREATE TABLE forum_message_likes (
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (message_id, user_id),
        KEY idx_forum_message_likes_user (user_id),
        CONSTRAINT fk_forum_message_likes_message FOREIGN KEY (message_id) REFERENCES forum_messages (id) ON DELETE CASCADE,
        CONSTRAINT fk_forum_message_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`);

    // Fill the stored statistics of existing threads.
    await sequelize.query(`UPDATE forums f SET
        message_count = (SELECT COUNT(*) FROM forum_messages m WHERE m.forum_id = f.id),
        last_message_at = COALESCE((SELECT MAX(m.created_at) FROM forum_messages m WHERE m.forum_id = f.id), f.created_at),
        last_message_author_id = (
            SELECT m.author_id FROM forum_messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
        )`);
};

export const down = async ({ sequelize }) => {
    await sequelize.query('DROP TABLE IF EXISTS forum_message_likes');
    await sequelize.query(`ALTER TABLE forum_messages
        DROP FOREIGN KEY fk_forum_messages_reply_to, DROP KEY idx_forum_messages_thread,
        DROP COLUMN reply_to_id, DROP COLUMN edited_at`);
    await sequelize.query(`ALTER TABLE forums
        DROP FOREIGN KEY fk_forums_category, DROP FOREIGN KEY fk_forums_book, DROP FOREIGN KEY fk_forums_last_author,
        DROP KEY idx_forums_board, DROP KEY idx_forums_activity,
        DROP COLUMN category_id, DROP COLUMN book_id, DROP COLUMN is_pinned, DROP COLUMN view_count,
        DROP COLUMN message_count, DROP COLUMN last_message_at, DROP COLUMN last_message_author_id`);
    await sequelize.query('DROP TABLE IF EXISTS forum_categories');
};
