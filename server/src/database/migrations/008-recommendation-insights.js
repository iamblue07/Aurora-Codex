/**
 * Explainable recommendations and reader feedback:
 *  - every recommendation records why it was made (`reason`: liked | genre | query) and, for
 *    "because you liked …", the book that led to it (`reason_book_id`);
 *  - `recommendation_runs` keeps how the current list was generated (one row per user);
 *  - `recommendation_dismissals` holds books a reader marked as "not interested": they are never
 *    recommended again and steer the profile away from similar books.
 */

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

export const up = async ({ sequelize }) => {
    await sequelize.query(`ALTER TABLE recommendations
        ADD COLUMN reason VARCHAR(16) NULL AFTER source,
        ADD COLUMN reason_book_id INT NULL AFTER reason,
        ADD CONSTRAINT fk_recommendations_reason_book FOREIGN KEY (reason_book_id) REFERENCES books (id) ON DELETE SET NULL`);

    await sequelize.query(`CREATE TABLE recommendation_runs (
        user_id INT NOT NULL,
        source VARCHAR(16) NOT NULL,
        query VARCHAR(500) NULL,
        sentiment VARCHAR(16) NULL,
        based_on VARCHAR(16) NULL,
        seed_count INT NOT NULL DEFAULT 0,
        personalized TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id),
        CONSTRAINT fk_recommendation_runs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`);

    await sequelize.query(`CREATE TABLE recommendation_dismissals (
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, book_id),
        CONSTRAINT fk_recommendation_dismissals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_recommendation_dismissals_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`);
};

export const down = async ({ sequelize }) => {
    await sequelize.query('DROP TABLE IF EXISTS recommendation_dismissals');
    await sequelize.query('DROP TABLE IF EXISTS recommendation_runs');
    await sequelize.query(`ALTER TABLE recommendations
        DROP FOREIGN KEY fk_recommendations_reason_book,
        DROP COLUMN reason_book_id,
        DROP COLUMN reason`);
};
