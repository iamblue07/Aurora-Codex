/**
 * The original (Bachelor's thesis) schema used Romanian table names created by `sequelize.sync()`.
 * If such a database is detected, its tables are renamed to `legacy_<name>` so the new schema can be
 * created next to them; 003-import-legacy-data copies the data across and 004-drop-legacy-tables
 * removes them afterwards.
 *
 * On a fresh database this migration does nothing.
 */

/** Lower-cased names of every table the legacy application created (including leftovers). */
export const LEGACY_TABLES = Object.freeze([
    'anuntbazars',
    'cartecitita',
    'cartecititas',
    'cartes',
    'cartes_backup',
    'chatbazars',
    'forums',
    'mesajchats',
    'mesajforums',
    'ofertacartes',
    'preferintes',
    'raports',
    'recomandare_istoric',
    'recomandareais',
    'utilizators',
]);

export const LEGACY_PREFIX = 'legacy_';

const listTables = async (sequelize) => {
    const [rows] = await sequelize.query(
        'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    );
    return rows.map((row) => row.name);
};

export const up = async ({ sequelize }) => {
    const tables = await listTables(sequelize);
    const lowerCased = new Set(tables.map((name) => name.toLowerCase()));

    // `utilizators` only exists in the legacy schema; `forums` exists in both, so it can't be the marker.
    if (!lowerCased.has('utilizators')) return;

    const renames = tables
        .filter((name) => LEGACY_TABLES.includes(name.toLowerCase()))
        .map((name) => `\`${name}\` TO \`${LEGACY_PREFIX}${name.toLowerCase()}\``);

    // A single RENAME TABLE statement is atomic and keeps foreign keys pointing at the renamed tables.
    await sequelize.query(`RENAME TABLE ${renames.join(', ')}`);
};

export const down = async ({ sequelize }) => {
    const tables = await listTables(sequelize);
    const renames = tables
        .filter((name) => name.toLowerCase().startsWith(LEGACY_PREFIX))
        .map((name) => `\`${name}\` TO \`${name.slice(LEGACY_PREFIX.length)}\``);
    if (renames.length) await sequelize.query(`RENAME TABLE ${renames.join(', ')}`);
};
