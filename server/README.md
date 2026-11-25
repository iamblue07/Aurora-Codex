# Server: REST API

Node.js / Express API behind Aurora Codex: catalogue and prices, ratings, AI recommendations,
marketplace with private chats, forums, statistics, moderation and the admin panel's jobs.
Endpoints are documented in [docs/API.md](docs/API.md).

## Setup

Requires Node.js 20+ and MySQL 8.

```powershell
copy .env.example .env   # DB_*, SECRET_KEY (long and random); the rest is optional
npm install
npm run dev              # http://localhost:3000, restarts on changes (`npm start` in production)
```

Pending migrations are applied on startup (`DB_MIGRATE_ON_START=false` turns that off).
Without `R2_BUCKET`, uploads are stored under `UPLOADS_DIR` (default `uploads/`); without
`DEEPINFRA_API_KEY`, the AI features report themselves as disabled and everything else works.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `npm start` | run the API (watch mode / production) |
| `npm run lint` · `npm test` | ESLint · unit tests (no database) |
| `npm run test:integration` | end-to-end tests: `$env:TEST_DB_NAME = "readers_api_test"` (must end in `_test`; the database is created and dropped) |
| `npm run db:status` · `db:migrate` · `db:rollback` | schema migrations |
| `npm run user -- list` · `reset-password <user>` · `make-admin <user>` · `revoke-admin <user>` | accounts (`reset-password` prints a new random password) |
| `npm run db:create-catalogue -- --from <db> --to <db>` | new database with the catalogue only (books, offers, emotion scores, embeddings, settings) |
| `npm run db:seed-demo` | 20 demo readers and an admin with ratings, forums, listings with photos, chats and reports; `--reset` replaces existing users, `--forums-only` / `--bazaar-only` refresh just that content |
| `npm run db:export` | dump the current database to `db/deploy/<DB_NAME>.sql` |
| `npm run storage:upload-local` | copy locally stored uploads to R2 (`--dry-run` to preview) |
| `npm run job -- <emotions\|embeddings\|scraper> [--limit N] [--concurrency N] [--batch-size N]` | run an admin job from the command line against the `.env` database, with progress; Ctrl+C cancels |

`db/deploy/` (dumps, demo photos, generated passwords) is git-ignored.

## Structure

```
src/
├── server.js       startup: database, migrations, HTTP server, graceful shutdown
├── app.js          Express app: security headers, CORS, static images, routes, errors
├── config/         validated environment config and upload paths
├── constants/      genres, permissions, sort options, listing conditions
├── database/       connection, migration runner and migrations
├── models/         Sequelize models and associations
├── routes/         one router per resource under /api
├── controllers/    input validation and response shaping
├── services/       business rules and data access
│   ├── ai/         DeepInfra client, vector maths, in-memory vector index
│   ├── jobs/       background jobs: scraper, embeddings, emotion analysis
│   ├── scraper/    bookstore scraper (Puppeteer)
│   └── storage/    Cloudflare R2 client
├── serializers/    JSON shapes of the API
├── middleware/     authentication, admin guard, uploads, rate limits, errors
└── utils/          HttpError, validation, files, images, logger, statistics
tests/unit/         pure logic
tests/integration/  the whole API against MySQL
```

A request goes **route → middleware → controller → service → model**. Services throw `HttpError`;
the central error handler answers `{ "error": "..." }` with the right status. Code, schema, API and
error messages are English; user-facing text is Romanian and lives in the client (genre labels are
the one server-side exception).

## Migrations

| Migration | What it does |
|---|---|
| `001`–`004` | Convert the original Romanian schema into the English one, importing its data; they do nothing on a fresh database. **Back up a legacy database before its first start.** |
| `005-create-ai-tables` | book embeddings, admin settings, background jobs |
| `006-forum-board` | forum categories, thread stats, pinned threads, replies, likes |
| `007-marketplace-details` | listing condition, city, delivery, reserved state, views, photos, favourites |
| `008-recommendation-insights` | recommendation reasons, generation runs, "not interested" |
| `009-session-versions` | revocable sessions |

## Recommender

1. **Embeddings.** The admin's *Vectori semantici* job embeds each book's title, author, genre and
   description with `Qwen/Qwen3-Embedding-4B` on DeepInfra (shortened to 1024 dimensions) and stores
   them in `book_embeddings`. A content hash skips unchanged books; the whole catalogue costs ~$0.55.
2. **Index.** MySQL 8 can't search vectors, so they are loaded into an int8 matrix shared with up to two
   worker threads (~50 MB for 50k books, ~0.1 s per search). It loads at startup and after each job.
3. **Candidates.** Profile lists search around the reader's taste (weighted average of books rated
   4–5) and around each favourite book; free-text requests embed the query, optionally blended with
   the taste. Read and dismissed books, and other editions of them, are excluded.
4. **Ranking.** Candidates resembling disliked (rated ≤ 2) or dismissed books are pushed down; the
   rest are re-ranked by the requested emotion and favourite genres, then diversified (MMR, at most
   two per author). Each result stores its reason ("because you liked …", a genre or the query).
5. **Emotion scores** (`anger_score` … `neutral_score`) come from a language model reading the
   descriptions (*Analiză emoțională* job). Books go to the model in batches (`emotions.batchSize`,
   default 10) with several requests in flight (`emotions.concurrency`, default 12); a book whose
   answer is unusable is retried alone.

Every weight is an admin setting (`src/services/settings.service.js`). Similar books
(`GET /api/books/:id/similar`) only read stored vectors and need no API key.

## Security notes

- Secrets are read only from the environment and redacted from every log line; AI provider errors reach clients as a generic 502.
- Tokens carry a per-user session version, so password changes, "sign out other devices" and deleted accounts invalidate them at once.
- Rate limits are listed in `src/middleware/rate-limit.js` (per IP, per user, per account for failed logins, and budgets for the paid AI calls).
- Uploads are limited by size, count, pixels and form fields, re-encoded as WebP, and private chat files are served sandboxed as downloads.
