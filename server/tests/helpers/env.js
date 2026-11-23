// Minimal configuration so modules that read `config` can be imported without a real .env.
// No test opens a database connection.
process.env.DB_NAME ??= 'test_db';
process.env.DB_USER ??= 'test_user';
process.env.SECRET_KEY ??= 'test-secret';
process.env.LOG_LEVEL ??= 'error';
