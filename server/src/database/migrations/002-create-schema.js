/**
 * Creates the application schema. Foreign keys and ON DELETE rules live here (not in model
 * associations) so the schema is explicit, reviewable and identical in every environment.
 */

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

const STATEMENTS = [
    `CREATE TABLE users (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(64) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        description TEXT NULL,
        avatar_path VARCHAR(255) NULL,
        can_create_listings TINYINT(1) NOT NULL DEFAULT 1,
        can_create_forums TINYINT(1) NOT NULL DEFAULT 1,
        can_send_messages TINYINT(1) NOT NULL DEFAULT 1,
        can_report TINYINT(1) NOT NULL DEFAULT 1,
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_email (email),
        UNIQUE KEY uq_users_username (username)
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE favorite_genres (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        genre VARCHAR(64) NOT NULL,
        position TINYINT NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_favorite_genres_user_genre (user_id, genre),
        UNIQUE KEY uq_favorite_genres_user_position (user_id, position),
        CONSTRAINT fk_favorite_genres_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE books (
        id INT NOT NULL AUTO_INCREMENT,
        isbn VARCHAR(64) NULL,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NULL,
        description TEXT NULL,
        english_description TEXT NULL,
        genre VARCHAR(64) NULL,
        cover_image VARCHAR(512) NULL,
        anger_score FLOAT NULL,
        disgust_score FLOAT NULL,
        fear_score FLOAT NULL,
        joy_score FLOAT NULL,
        sadness_score FLOAT NULL,
        surprise_score FLOAT NULL,
        neutral_score FLOAT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_books_isbn (isbn),
        KEY idx_books_genre (genre),
        KEY idx_books_title (title)
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE book_offers (
        id INT NOT NULL AUTO_INCREMENT,
        book_id INT NOT NULL,
        store VARCHAR(64) NOT NULL,
        url VARCHAR(512) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_book_offers_book_price (book_id, price),
        CONSTRAINT fk_book_offers_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE read_books (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        rating TINYINT NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_read_books_user_book (user_id, book_id),
        KEY idx_read_books_book (book_id),
        CONSTRAINT fk_read_books_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_read_books_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
        CONSTRAINT chk_read_books_rating CHECK (rating BETWEEN 0 AND 5)
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE recommendations (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_recommendations_user (user_id),
        CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_recommendations_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE listings (
        id INT NOT NULL AUTO_INCREMENT,
        seller_id INT NOT NULL,
        book_id INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        genre VARCHAR(64) NOT NULL,
        is_negotiable TINYINT(1) NOT NULL DEFAULT 0,
        is_available TINYINT(1) NOT NULL DEFAULT 1,
        image_path VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_listings_available_created (is_available, created_at),
        KEY idx_listings_genre (genre),
        KEY idx_listings_seller (seller_id),
        KEY idx_listings_book (book_id),
        CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_listings_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE SET NULL,
        CONSTRAINT chk_listings_price CHECK (price >= 0)
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE chats (
        id INT NOT NULL AUTO_INCREMENT,
        listing_id INT NOT NULL,
        seller_id INT NOT NULL,
        buyer_id INT NOT NULL,
        is_open TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_chats_listing_buyer (listing_id, buyer_id),
        KEY idx_chats_seller (seller_id),
        KEY idx_chats_buyer (buyer_id),
        CONSTRAINT fk_chats_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
        CONSTRAINT fk_chats_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_chats_buyer FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE chat_messages (
        id INT NOT NULL AUTO_INCREMENT,
        chat_id INT NOT NULL,
        sender_id INT NOT NULL,
        content TEXT NULL,
        media_path VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_chat_messages_chat_created (chat_id, created_at),
        CONSTRAINT fk_chat_messages_chat FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
        CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE forums (
        id INT NOT NULL AUTO_INCREMENT,
        author_id INT NULL,
        title VARCHAR(255) NOT NULL,
        is_open TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_forums_created (created_at),
        KEY idx_forums_author (author_id),
        CONSTRAINT fk_forums_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE forum_messages (
        id INT NOT NULL AUTO_INCREMENT,
        forum_id INT NOT NULL,
        author_id INT NULL,
        content TEXT NOT NULL,
        is_removed TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_forum_messages_forum_created (forum_id, created_at),
        KEY idx_forum_messages_author (author_id),
        CONSTRAINT fk_forum_messages_forum FOREIGN KEY (forum_id) REFERENCES forums (id) ON DELETE CASCADE,
        CONSTRAINT fk_forum_messages_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE reports (
        id INT NOT NULL AUTO_INCREMENT,
        reporter_id INT NOT NULL,
        target_type VARCHAR(32) NOT NULL,
        target_id INT NOT NULL,
        reason TEXT NOT NULL,
        is_open TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_reports_open_created (is_open, created_at),
        KEY idx_reports_target (target_type, target_id),
        CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,
];

/** Tables in reverse dependency order, for `down`. */
const TABLES = [
    'reports', 'forum_messages', 'forums', 'chat_messages', 'chats', 'listings',
    'recommendations', 'read_books', 'book_offers', 'books', 'favorite_genres', 'users',
];

export const up = async ({ sequelize }) => {
    for (const statement of STATEMENTS) {
        await sequelize.query(statement);
    }
};

export const down = async ({ sequelize }) => {
    for (const table of TABLES) {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
};
