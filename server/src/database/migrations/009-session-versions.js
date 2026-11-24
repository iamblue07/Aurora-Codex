/**
 * Revocable sessions: tokens carry the user's `token_version`; bumping it (password change,
 * "sign out everywhere") makes every token issued before invalid at once.
 */
export const up = async ({ sequelize }) => {
    await sequelize.query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER password_hash');
};

export const down = async ({ sequelize }) => {
    await sequelize.query('ALTER TABLE users DROP COLUMN token_version');
};
