// Minimal configuration so modules that read `config` can be imported without a real .env.
// No test opens a database connection.
process.env.DB_NAME ??= 'test_db';
process.env.DB_USER ??= 'test_user';
process.env.SECRET_KEY ??= 'test-secret';
process.env.LOG_LEVEL ??= 'error';
// Pinned (not defaulted): dotenv never overrides variables that are already set, so a developer's
// .env with R2 storage or a real AI key cannot change what the unit tests see.
process.env.R2_BUCKET = '';
process.env.R2_PUBLIC_URL = '';
process.env.DEEPINFRA_API_KEY = '';
