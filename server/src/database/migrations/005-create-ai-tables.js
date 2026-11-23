/**
 * Tables behind the in-server recommender and the admin panel:
 *  - book_embeddings: one semantic vector per book, stored as packed little-endian float32
 *    (the same byte layout as MySQL 9's VECTOR type; MySQL 8 has no vector type, so a BLOB).
 *  - app_settings: tunable parameters edited from the admin panel (JSON values).
 *  - background_jobs: history and progress of admin-triggered jobs (scraper, embeddings…).
 */

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

const STATEMENTS = [
    `CREATE TABLE book_embeddings (
        book_id INT NOT NULL,
        model VARCHAR(128) NOT NULL,
        dimensions SMALLINT UNSIGNED NOT NULL,
        content_hash CHAR(64) NOT NULL,
        embedding MEDIUMBLOB NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (book_id),
        KEY idx_book_embeddings_model (model, dimensions),
        CONSTRAINT fk_book_embeddings_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE app_settings (
        \`key\` VARCHAR(64) NOT NULL,
        value JSON NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`key\`)
    ) ${TABLE_OPTIONS}`,

    `CREATE TABLE background_jobs (
        id INT NOT NULL AUTO_INCREMENT,
        type VARCHAR(32) NOT NULL,
        status VARCHAR(16) NOT NULL,
        params JSON NOT NULL,
        total INT NULL,
        processed INT NOT NULL DEFAULT 0,
        failed INT NOT NULL DEFAULT 0,
        message VARCHAR(500) NULL,
        result JSON NULL,
        started_by INT NULL,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_background_jobs_type (type, started_at),
        CONSTRAINT fk_background_jobs_user FOREIGN KEY (started_by) REFERENCES users (id) ON DELETE SET NULL
    ) ${TABLE_OPTIONS}`,

    // Recommendations now remember why a book was picked (shown to the user).
    `ALTER TABLE recommendations
        ADD COLUMN score FLOAT NULL AFTER book_id,
        ADD COLUMN source VARCHAR(16) NULL AFTER score`,
];

export const up = async ({ sequelize }) => {
    for (const statement of STATEMENTS) {
        await sequelize.query(statement);
    }
};

export const down = async ({ sequelize }) => {
    await sequelize.query('ALTER TABLE recommendations DROP COLUMN source, DROP COLUMN score');
    for (const table of ['background_jobs', 'app_settings', 'book_embeddings']) {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
};
