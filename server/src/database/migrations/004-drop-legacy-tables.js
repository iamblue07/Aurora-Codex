/**
 * Removes the archived legacy (Romanian) tables once their data lives in the new schema.
 *
 * Safety net: the drop only happens when the import evidently ran, i.e. the new `users` and
 * `books` tables hold at least as many rows as their legacy counterparts. Otherwise the migration
 * fails and nothing is deleted. Take a database backup before the first start of this version.
 *
 * Irreversible: `down` does nothing (restore from backup instead).
 */
import { LEGACY_PREFIX } from './001-archive-legacy-schema.js';

const countRows = async (sequelize, table) => {
    const [[row]] = await sequelize.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    return Number(row.total);
};

export const up = async ({ sequelize }) => {
    const [rows] = await sequelize.query(
        'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE ?',
        { replacements: [`${LEGACY_PREFIX}%`] },
    );
    const legacyTables = rows.map((row) => row.name);
    if (legacyTables.length === 0) return;

    for (const [table, legacyTable] of [['users', 'utilizators'], ['books', 'cartes']]) {
        const legacyName = `${LEGACY_PREFIX}${legacyTable}`;
        if (!legacyTables.includes(legacyName)) continue;
        const [imported, legacy] = await Promise.all([countRows(sequelize, table), countRows(sequelize, legacyName)]);
        if (imported < legacy) {
            throw new Error(`Refusing to drop legacy tables: ${table} has ${imported} rows but ${legacyName} has ${legacy}`);
        }
    }

    // One statement, so foreign keys between the legacy tables don't dictate a drop order.
    await sequelize.query(`DROP TABLE ${legacyTables.map((name) => `\`${name}\``).join(', ')}`);
};

export const down = async () => {
    // Intentionally irreversible.
};
