/**
 * Richer marketplace listings:
 *  - book author, condition, city and delivery options (personal pickup / shipping);
 *  - a "reserved" state between available and sold, a view counter and an edit timestamp;
 *  - several photos per listing (`listing_images`, ordered; `listings.image_path` stays the cover);
 *  - favourites (`listing_favorites`), with the count stored on the listing.
 */

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

export const up = async ({ sequelize }) => {
    await sequelize.query(`ALTER TABLE listings
        ADD COLUMN author VARCHAR(255) NULL AFTER title,
        ADD COLUMN book_condition ENUM('new', 'like_new', 'very_good', 'good', 'acceptable') NOT NULL DEFAULT 'good' AFTER genre,
        ADD COLUMN city VARCHAR(80) NULL AFTER book_condition,
        ADD COLUMN offers_pickup TINYINT(1) NOT NULL DEFAULT 1 AFTER city,
        ADD COLUMN offers_shipping TINYINT(1) NOT NULL DEFAULT 0 AFTER offers_pickup,
        ADD COLUMN is_reserved TINYINT(1) NOT NULL DEFAULT 0 AFTER is_available,
        ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER is_reserved,
        ADD COLUMN favorite_count INT NOT NULL DEFAULT 0 AFTER view_count,
        ADD COLUMN updated_at DATETIME NULL AFTER created_at,
        ADD KEY idx_listings_city (city)`);

    await sequelize.query(`CREATE TABLE listing_images (
        id INT NOT NULL AUTO_INCREMENT,
        listing_id INT NOT NULL,
        path VARCHAR(255) NOT NULL,
        position SMALLINT NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_listing_images_listing (listing_id, position),
        CONSTRAINT fk_listing_images_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`);
    await sequelize.query(`INSERT INTO listing_images (listing_id, path, position)
        SELECT id, image_path, 0 FROM listings WHERE image_path IS NOT NULL`);

    await sequelize.query(`CREATE TABLE listing_favorites (
        listing_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (listing_id, user_id),
        KEY idx_listing_favorites_user (user_id, created_at),
        CONSTRAINT fk_listing_favorites_listing FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
        CONSTRAINT fk_listing_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`);
};

export const down = async ({ sequelize }) => {
    await sequelize.query('DROP TABLE IF EXISTS listing_favorites');
    await sequelize.query('DROP TABLE IF EXISTS listing_images');
    await sequelize.query(`ALTER TABLE listings
        DROP KEY idx_listings_city,
        DROP COLUMN author,
        DROP COLUMN book_condition,
        DROP COLUMN city,
        DROP COLUMN offers_pickup,
        DROP COLUMN offers_shipping,
        DROP COLUMN is_reserved,
        DROP COLUMN view_count,
        DROP COLUMN favorite_count,
        DROP COLUMN updated_at`);
};
