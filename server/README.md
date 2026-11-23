# Server: REST API

Node.js / Express API for the readers web app: catalogue and price comparison, reading history,
AI recommendations (semantic search over book embeddings), marketplace with private chats, forums,
reports and moderation.

## Requirements

- Node.js 20+
- MySQL 8

## Getting started

```bash
cp .env.example .env      # then edit DB_* and SECRET_KEY
npm install
npm run dev               # auto-restarts on changes; `npm start` in production
```

On startup the server connects to MySQL and applies any pending migrations
(set `DB_MIGRATE_ON_START=false` to manage them yourself).

| Script | Purpose |
|---|---|
| `npm start` / `npm run dev` | run the API (dev = watch mode) |
| `npm run lint` | ESLint |
| `npm test` | unit tests (`node:test`, no database needed) |
| `npm run test:integration` | end-to-end API tests against a throwaway MySQL database (see below) |
| `npm run db:migrate` / `db:rollback` / `db:status` | manage schema migrations |

### Integration tests

```powershell
$env:TEST_DB_NAME = "readers_api_test"; npm run test:integration
```

The tests create the database from the migrations, run the app in-process on a random port,
store uploads in a temporary folder and drop everything afterwards. The database name must end
with `_test` (the suite refuses to run otherwise). Credentials come from `.env`.

## Project structure

```
src/
├── server.js            entry point: DB connection, migrations, HTTP server, graceful shutdown
├── app.js               Express app: security headers, CORS, static images, routes, error handling
├── config/              validated environment config (env.js) and filesystem paths (paths.js)
├── constants/           domain enums: genres, permissions, report targets, sort options
├── database/            Sequelize connection, migration runner/CLI and versioned migrations
├── models/              Sequelize models (English, camelCase ↔ snake_case columns) + associations
├── routes/              one router per resource, mounted under /api
├── controllers/         HTTP layer: parse/validate input, call services, serialize output
├── services/            business rules and data access (one module per domain)
│   ├── ai/              DeepInfra client, vector math, in-memory vector index, AI status
│   ├── jobs/            background job runner + scraper, embeddings and emotion jobs
│   └── scraper/         bookstore scraper (Puppeteer)
├── serializers/         model → JSON response shapes (the API contract lives here)
├── validators/          reusable input validators (email, username, password)
├── middleware/          authentication, admin guard, uploads, rate limiting, error handling
└── utils/               HttpError, async handler, validation, statistics, files, logger
tests/unit/              fast tests of pure logic
tests/integration/       end-to-end API tests (opt-in, need MySQL)
docs/API.md              endpoint reference + old → new route mapping
uploads/images/          public images (avatars, listing pictures)
uploads/chat-media/      private chat attachments (served only through an authorised endpoint)
```

Requests flow **route → middleware → controller → service → model**. Services throw `HttpError`s and
the central error handler turns every error into `{ "error": "..." }` with the right status code.

## Database & migrations

The schema is defined by migrations in `src/database/migrations` (it is no longer created with
`sequelize.sync()`):

1. `001-archive-legacy-schema`: when it finds the original Romanian schema (`utilizators`,
   `cartes`, …), it renames those tables to `legacy_*`. On a fresh database it does nothing.
2. `002-create-schema`: creates the English schema with explicit foreign keys, cascades,
   unique constraints and indexes.
3. `003-import-legacy-data`: copies the legacy data into the new tables, preserving IDs. Along the
   way it skips orphan rows, collapses duplicates, converts genre labels to codes, converts upload
   paths, turns placeholder texts (`Necunoscut`, `Fara descriere...`) into `NULL` and the old
   "deleted by admin" text into an `is_removed` flag.
4. `004-drop-legacy-tables`: drops the `legacy_*` tables, but only if the new `users` and `books`
   tables hold at least as many rows as the legacy ones. This step is irreversible.
5. `005-create-ai-tables`: `book_embeddings`, `app_settings` and `background_jobs`, plus the
   `score`/`source` columns of `recommendations`.

> **Back up the database before the first start of this version** (see below). On a legacy
> database the migrations run automatically at startup unless `DB_MIGRATE_ON_START=false`.

### Restoring a dump on Windows

Don't create dumps with PowerShell redirection (`mysqldump … > dump.sql`). PowerShell re-encodes the
output as UTF-16 and mangles every diacritic (`Ț` becomes `╚Ü`). Use `--result-file` instead:

```powershell
mysqldump -u root -p --default-character-set=utf8mb4 --result-file=dump.sql LicentaDB
mysql -u root -p --default-character-set=utf8mb4 LicentaDB -e "source dump.sql"
```

## Deployment database with demo content

Three scripts build a database for a public proof of concept, separate from your development data:

```powershell
npm run db:create-catalogue -- --from LicentaDB --to aurora_codex   # catalogue only, no users
$env:DB_NAME = "aurora_codex"; $env:UPLOADS_DIR = "db/deploy/uploads"
npm run db:seed-demo          # 20 demo readers + admin, forums, listings (with photos), chats, reports
npm run db:export -- --mysqldump "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe"
```

- `db:create-catalogue` copies books, store offers, emotion scores, embeddings and settings.
- `db:seed-demo` is deterministic and refuses to touch a database that has users unless given
  `--reset`, which deletes every user and everything they created. It writes the generated
  passwords to `db/deploy/demo-accounts.local.txt` and the listing photos to `UPLOADS_DIR`.
- `db:export` writes `db/deploy/<DB_NAME>.sql` (UTF-8, embeddings hex-encoded).

`db/deploy/` is git-ignored. To deploy, import the SQL file, copy `db/deploy/uploads/images`
into the host's uploads folder, then generate the remaining embeddings from the admin panel.

## AI recommendations

Recommendations are computed inside the API (the former Python service is no longer needed).

1. **Embeddings.** Each book is turned into one vector by an embedding model on DeepInfra
   (default `Qwen/Qwen3-Embedding-4B`, multilingual, cut to 1024 dimensions). The text is the title,
   author, genre and description. Vectors are stored in MySQL (`book_embeddings.embedding`,
   packed float32, the byte layout of MySQL 9's `VECTOR` type). A content hash lets later
   runs skip unchanged books.
2. **Search.** MySQL 8 can't compare vectors (and MySQL 9 Community has no `DISTANCE()`), so the
   API loads them into an in-memory int8 index (~50 MB for 50k books, ~0.1 s per search),
   built on first use and rebuilt after each embeddings run.
3. **Ranking.** The nearest books to the search query (or to the reader's taste, the average vector of the books
   they rated highly) are re-ranked by the requested emotion score and preferred genres.
4. **Emotion scores** (`anger_score` … `neutral_score`) come from a language model that reads the
   Romanian descriptions directly. The scores computed by the old pipeline are kept; the job only fills in missing ones.

Everything is driven from the admin panel (`/admin` in the client): connection test, the coverage of
embeddings and emotion scores, every tunable setting (`src/services/settings.service.js`), and the
background jobs (scraper, embeddings, emotions) with live progress, cancellation and history.
Set `DEEPINFRA_API_KEY` in `.env` to enable it; without a key the AI features are reported as
disabled and everything else works.

**Cost and speed** (measured on DeepInfra): a book is ~490 tokens, so the whole catalogue is ~27M
tokens. Qwen3-Embedding-4B ($0.02 per million tokens) costs about $0.55 for it and embeds a search
query in ~0.25 s. The 8B model is half the price but took 4–6 s per query, too slow for a click.
Later runs only embed new or changed books, and repeated queries are cached in memory.

## Notes

- **Language.** Code, schema, API and error messages are in English. Only end-user content stays Romanian: the genre display labels in `src/constants/genres.js`. The UI shows its own Romanian texts, including for errors. One deliberate exception: the fallback search phrase in `recommendation.service.js` and the labels in `services/ai/book-text.js` are Romanian, because they are compared with Romanian book descriptions.
- **Security.** Every route is rate limited (see `src/middleware/rate-limit.js` and `docs/API.md`); endpoints that call the paid AI provider also have per-user daily and global hourly budgets. `DEEPINFRA_API_KEY` is only read by `services/ai/deepinfra.client.js`, is sent only over HTTPS, and is never returned by the API. The logger redacts it (and `SECRET_KEY`, `DB_PASS`, bearer tokens) from every line, and provider errors reach clients only as a generic 502.
- **Accounts.** `npm run user -- list | reset-password <email|username> [--out file.local.txt] | make-admin <user> | revoke-admin <user>`.
- **Keep-alive.** For free-tier hosting, the server runs `SELECT 1` against the database every 2–4 minutes (random; `DB_KEEPALIVE*` in `.env`), and the client pings `GET /health` every 2–4 minutes while the app is open, so neither the database nor the API falls asleep between visits.
- **Missing data is NULL.** A book without an author or description has `null`; the UI renders the placeholder.
- **Uploads.** Files live under `UPLOADS_DIR` (default `uploads/`). Point it at a persistent disk in production.
- **Scraper.** Admin-only background job started from the admin panel. It needs the optional `puppeteer` dependency; with npm 11+ run `npm install-scripts approve puppeteer` so Chromium gets downloaded. Without it, the panel shows the scraper as unavailable.
