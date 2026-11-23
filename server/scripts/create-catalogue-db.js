/**
 * Creates a fresh database holding only the book catalogue, e.g. for a deployment:
 * books, store offers, emotion scores, book embeddings and the admin settings. No users and
 * nothing users created (listings, chats, forums, ratings, reports…).
 *
 *   node scripts/create-catalogue-db.js --from <source database> --to <new database>
 *
 * Both databases live on the MySQL server configured in .env (DB_HOST/DB_PORT/DB_USER/DB_PASS).
 * The target must not exist yet. Its schema comes from the migrations, so it is always current.
 */
import { Sequelize } from 'sequelize';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, value, i, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[i + 1]]] : pairs), []),
);
const NAME = /^[A-Za-z0-9_]{1,64}$/;
if (!NAME.test(args.from ?? '') || !NAME.test(args.to ?? '') || args.from === args.to) {
    console.error('Usage: node scripts/create-catalogue-db.js --from <source db> --to <new db>');
    process.exit(1);
}

/** Copied in dependency order. Every other table stays empty. */
const CATALOGUE_TABLES = ['books', 'book_offers', 'book_embeddings', 'app_settings'];

process.env.DB_NAME = args.to; // config reads DB_NAME when first imported
const { default: config } = await import('../src/config/env.js');

const admin = new Sequelize('', config.db.user, config.db.password, {
    host: config.db.host, port: config.db.port, dialect: 'mysql', logging: false,
});
const [[existing]] = await admin.query('SELECT COUNT(*) AS n FROM information_schema.schemata WHERE schema_name = ?', {
    replacements: [args.to],
});
if (existing.n > 0) {
    console.error(`Database "${args.to}" already exists; choose a new name or drop it first.`);
    await admin.close();
    process.exit(1);
}
await admin.query(`CREATE DATABASE \`${args.to}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
await admin.close();

const { connectDatabase, closeDatabase, default: sequelize } = await import('../src/database/connection.js');
const { runMigrations } = await import('../src/database/migrator.js');
try {
    await connectDatabase();
    await runMigrations();
    for (const table of CATALOGUE_TABLES) {
        // Same migrations on both sides, so the column lists match; name them anyway for safety.
        const [columns] = await sequelize.query(
            'SELECT column_name AS name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
            { replacements: [args.to, table] },
        );
        const list = columns.map(({ name }) => `\`${name}\``).join(', ');
        await sequelize.query(`INSERT INTO \`${table}\` (${list}) SELECT ${list} FROM \`${args.from}\`.\`${table}\``);
        const [[{ n }]] = await sequelize.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        console.log(`${table}: ${n} rows`);
    }
    console.log(`Catalogue database "${args.to}" is ready.`);
} catch (error) {
    console.error('Failed:', error.message);
    process.exitCode = 1;
} finally {
    await closeDatabase();
}
