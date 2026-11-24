# REST API

All endpoints live under `/api` (plus `GET /health` and the static `/uploads/images/*`).
JSON fields are camelCase English and error messages are English (they are meant for developers;
the client shows its own Romanian texts). Missing optional data is `null` (e.g. a book's `author`).

## Conventions

| Topic | Rule |
|---|---|
| Auth | `Authorization: Bearer <jwt>` (from `/api/auth/login` or `/register`). 🔒 = required, 🛡️ = administrator. Tokens are revocable: changing the password or `POST /me/sessions/revoke` invalidates every earlier token, and tokens of deleted accounts stop working. |
| Rate limits | 429 `{ error }` with `RateLimit` headers when exceeded. Per IP: 1500 requests / 15 min on `/api`, 20 login/register attempts / 15 min, 120 availability checks / 15 min. Per account: 10 failed logins / 15 min (successful ones don't count). Per user: 60 posts/messages/listings/reports / 10 min, 20 uploads / 15 min, 10 password changes / 15 min, 30 admin AI actions / 15 min. AI recommendations: 10 / 15 min and 60 / day per user, 600 / hour for everyone together. |
| Users | Wherever a user appears next to content (`author`, `seller`, `buyer`, `reporter`, `targetAuthor`) it is `{ id, username, avatarUrl }`; `avatarUrl` is `null` without a picture. |
| Errors | `{ "error": "<message>", "details"?: [...] }` with a meaningful status: 400 invalid input, 401 not logged in / bad credentials, 403 not allowed, 404 not found, 409 conflict, 413 too large, 502 AI provider error, 503 AI features not configured (no `DEEPINFRA_API_KEY`) or no book embeddings yet. |
| Pagination | `?page=1&limit=10` → `{ items, page, limit, total, totalPages }` |
| Genres | Stored and sent as codes (`fiction`, `children_teens`, …). Responses carry `{ code, label }` with the Romanian label. Full list: `GET /api/genres`. |
| Images | Responses contain ready-to-use URLs (`avatarUrl`, `imageUrl`, `coverUrl`, `mediaUrl`) relative to the server origin. Avatars and listing images are public static files. Chat media needs the bearer token. |
| Empty success | `204 No Content` for deletes. |

## Endpoints

### Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/availability` | `{ email?, username? }` | `{ emailAvailable?, usernameAvailable? }` |
| POST | `/auth/register` | `{ email, username, password }` (password ≥ 8) | `201 { token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| POST 🔒 | `/auth/refresh` | — | `{ token, user }`: a fresh token for a still-valid session (the client renews active sessions before expiry) |

`user` is the account object returned by `GET /api/me`. Rate limits per IP and 15 minutes: 20 for
login + register, 300 for availability checks (safe to call while the user types).

### Current user 🔒 (`/me`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me` | `{ id, email, username, description, avatarUrl, isAdmin, permissions: { canCreateListings, canCreateForums, canSendMessages, canReport }, createdAt }` |
| PATCH | `/me` | `{ description }` |
| PUT | `/me/password` | `{ currentPassword, newPassword }` → `{ token }`: every other session is signed out, this one continues with the new token. A wrong current password is 403. |
| POST | `/me/sessions/revoke` | signs out every other device → `{ token }` for this one |
| PUT | `/me/avatar` | multipart, field `image` (jpg/png ≤ 5 MB) |
| GET / PUT | `/me/favorite-genres` | PUT `{ genres: ["fiction", …] }` (0–5 distinct codes) → `{ genres: [{ code, label }] }` |
| GET | `/me/reading-history` | `[{ id, rating, book: { id, title, author, coverUrl } }]` |
| GET | `/me/recommendations` | `{ items: [{ book, score (0–1), reason: liked\|genre\|query\|null, reasonBook: { id, title } \| null }], run: { source, query, sentiment, basedOn, seedCount, personalized, createdAt } \| null, dismissedCount }` |
| POST | `/me/recommendations` | `{ query?, sentiment?, personalized? }` (sentiment ∈ `anger`, `disgust`, `fear`, `joy`, `sadness`, `surprise`, `neutral`). Without `query`: candidates near the reader's taste (weighted average of books rated ≥ 4) **and** near each favourite book separately, scored half on each; favourite genres for readers without ratings. With `query`: near the embedded request, blended with the reader's taste when `personalized`. Then books resembling disliked (≤ 2) or dismissed ones are pushed down, read/dismissed books and their other editions are skipped, the list is re-ranked by emotion and preferred genres and diversified (MMR, max 2 per author). Returns the same payload as GET. 503 until embeddings and an AI key exist. |
| DELETE | `/me/recommendations/:bookId` | "not interested": removed now and never recommended again → 204 |
| DELETE | `/me/recommendation-dismissals` | forgets every "not interested" → `{ cleared }` |
| GET | `/me/listings` · `/me/forums` · `/me/chats` | own listings / forums (paginated) / conversations |
| GET | `/me/favorite-listings` | saved listings, most recently saved first (paginated) |

### Users
| Method | Path | Notes |
|---|---|---|
| GET | `/users/:userId` | public profile incl. `favoriteGenres` |
| GET | `/users/:userId/avatar` | image file |
| GET | `/users/:userId/listings` | listing summaries |
| GET | `/users/:userId/forums` | paginated forums |

### Books
| Method | Path | Notes |
|---|---|---|
| GET | `/books` | `?search=&genres=fiction,history&minPrice=&maxPrice=&sort=price_asc\|price_desc\|title_asc\|title_desc&page=&limit=` → paginated summaries `{ id, title, author, isbn, genre, coverUrl, lowestPrice }`. `?ids=3,1,2` instead returns those books in that order. |
| GET | `/books/lookup?query=` | quick title search (linking a listing to a book) |
| GET | `/books/random` | 20 random summaries |
| GET | `/books/:bookId` | details incl. `description`, `englishDescription`, `emotions` |
| GET | `/books/:bookId/cover` | image (remote covers are proxied: HTTPS on `COVER_IMAGE_HOSTS` only, raster types, ≤ 5 MB) |
| GET | `/books/:bookId/offers` | `[{ id, store, url, price }]` cheapest first |
| GET | `/books/:bookId/listings` | marketplace listings for this book |
| GET | `/books/:bookId/external-info` | `{ publisher, year, pageCount, language, offer? }` from Google Books, looked up server-side by ISBN, or `null` |
| GET | `/books/:bookId/similar` | `?limit=` (1–24, default 8): book summaries closest in meaning, from stored embeddings (no AI call; other editions left out, max 2 per author); `[]` without embeddings |
| GET / PUT / DELETE 🔒 | `/books/:bookId/rating` | `{ isRead, rating }` · PUT `{ rating: 0-5 }` marks as read · DELETE unmarks |

### Marketplace listings
A listing has 1–6 photos (the first is the cover), a book `condition` (`new`, `like_new`, `very_good`, `good`, `acceptable`), an optional `author` and `city`, delivery options (`offersPickup`, `offersShipping`, at least one), and a state: available, `isReserved` (still listed) or sold (`isAvailable: false`, final). Summaries carry `viewCount`, `favoriteCount` and, for a signed-in viewer, `isFavorite`.

| Method | Path | Notes |
|---|---|---|
| GET | `/listings` | `?search=` (title or author) `&genre=&condition=a,b&city=&shipping=true&minPrice=&maxPrice=&seller=<userId>&sort=newest\|oldest\|price_asc\|price_desc\|popular&page=&limit=` (max 48) → paginated listings on offer |
| GET | `/listings/cities` | `[{ city, count }]` cities with listings on offer |
| POST 🔒 | `/listings` | multipart: `images` (1–6 files), `title`, `author?`, `description`, `price`, `genre`, `condition?`, `city?`, `offersPickup?`, `offersShipping?`, `isNegotiable?`, `bookId?` → 201 listing |
| GET | `/listings/:listingId` | details: `images [{ id, url }]`, `book`, `sellerStats { memberSince, activeListings, soldListings }`, `storePrice { store, price }` (lowest bookstore price of the linked book), `isOwner`, `isFavorite`. Counts a view (once per visitor every 30 min; not the seller's). |
| GET | `/listings/:listingId/similar` | up to 4 listings: same book first, then the same genre |
| GET | `/listings/:listingId/image` | cover image file |
| PATCH 🔒 owner | `/listings/:listingId` | any of `title, author, description, price, genre, condition, city, offersPickup, offersShipping, isNegotiable, isReserved, bookId` (open listings only) |
| POST 🔒 owner | `/listings/:listingId/images` | multipart `images`: adds photos (6 in total at most) |
| DELETE 🔒 owner | `/listings/:listingId/images/:imageId` | removes a photo (the last one stays) |
| PUT 🔒 owner | `/listings/:listingId/images/:imageId/cover` | makes that photo the cover |
| POST 🔒 owner | `/listings/:listingId/close` | marks as sold (final) |
| DELETE 🔒 owner | `/listings/:listingId` | deletes listing, its photos, chats and files |
| PUT · DELETE 🔒 | `/listings/:listingId/favorite` | save / un-save (not your own) → `{ favoriteCount, isFavorite }` |
| GET 🔒 | `/listings/:listingId/chat` | `{ chat \| null }`: your conversation about it |
| POST 🔒 | `/listings/:listingId/chats` | `{ message }`: contact the seller → 201 chat |

### Chats 🔒 (participants only)
| Method | Path | Notes |
|---|---|---|
| GET | `/chats/:chatId` | `{ id, isOpen, isSeller, listing, seller, buyer, createdAt }` |
| PATCH | `/chats/:chatId` | `{ isOpen }` (buyer only) |
| GET | `/chats/:chatId/messages` | `[{ id, senderId, isOwn, isMedia, content, mediaUrl, createdAt }]` (admins may read too) |
| POST | `/chats/:chatId/messages` | `{ content }` |
| POST | `/chats/:chatId/media` | multipart, field `file` (jpg/png/pdf ≤ 10 MB) |
| GET | `/chats/:chatId/messages/:messageId/media` | the file (participants and admins) |

### Forums
The board is organised as **categories → threads (`forums`) → posts (`forum_messages`)**. Creating a thread also creates its opening post (position 1). Thread stats (`postCount`, `replyCount`, `viewCount`, `lastPost`) are stored on the thread and kept up to date on every write.

| Method | Path | Notes |
|---|---|---|
| GET | `/forums/categories` | `{ categories: [{ id, slug, name, description, icon, threadCount, postCount, latestThread }], stats: { threads, posts, members } }` |
| GET | `/forums` | `?category=<slug>&book=<id>&search=&sort=activity\|newest\|replies\|views&page=&limit=` (max 50). Paginated threads `{ id, title, isOpen, isPinned, category, author, book, postCount, replyCount, viewCount, lastPost: { at, author }, createdAt }` plus `category`. Pinned threads come first inside a category. |
| POST 🔒 | `/forums` | `{ title (3–160), content (10–10 000), categoryId, bookId? }` → the thread (201). Needs `canCreateForums`. |
| GET | `/forums/:forumId` | the thread; counts a view (once per user/IP every 30 min) |
| PATCH 🔒 owner/admin | `/forums/:forumId` | `{ title?, isOpen? }`; administrators also `{ isPinned?, categoryId? }` |
| GET | `/forums/:forumId/messages` | `?page=&limit=` (default 15, max 50), oldest first: `{ id, position, content, isRemoved, editedAt, author: { id, username, avatarUrl, isAdmin, joinedAt, postCount }, replyTo: { id, author, excerpt }, likeCount, likedByMe, createdAt }`. Removed posts have `content: null`. |
| POST 🔒 | `/forums/:forumId/messages` | `{ content (2–10 000), replyToId? }` → `{ id, position }` (201). Thread must be open; `replyToId` must be a post of the same thread. Needs `canSendMessages`. |
| PATCH 🔒 author | `/forums/messages/:messageId` | `{ content }` → `{ id, content, editedAt }` (thread must be open) |
| DELETE 🔒 author | `/forums/messages/:messageId` | soft delete: the post stays as "deleted" so numbering is kept |
| PUT · DELETE 🔒 | `/forums/messages/:messageId/like` | like / unlike → `{ likeCount, likedByMe }` (not your own posts) |

### Reports
| Method | Path | Notes |
|---|---|---|
| POST 🔒 | `/reports` | `{ targetType: chat_message\|forum_message\|forum\|listing, targetId, reason }`. Chat messages can only be reported by the chat's participants. |
| GET 🛡️ | `/reports` | `?status=open\|closed\|all` paginated |
| GET 🛡️ | `/reports/:reportId` | report + `target` (reported content, `null` if deleted) + `targetAuthor` |
| PATCH 🛡️ | `/reports/:reportId` | `{ isOpen }` |

### Administration 🛡️ (`/admin`)
| Method | Path | Notes |
|---|---|---|
| PUT | `/admin/users/:userId/permissions/:permission` | permission ∈ `createListings`, `createForums`, `sendMessages`, `report`. Body `{ granted }`. |
| DELETE | `/admin/forum-messages/:messageId` | hides the message |
| DELETE | `/admin/listings/:listingId` · `/admin/forums/:forumId` | delete content |
| GET | `/admin/ai` | AI overview: `{ provider: { name, configured, baseUrl }, catalogue: { totalBooks }, embeddings: { model, dimensions, embeddedBooks, outdatedBooks, missingBooks }, emotions: { model, eligibleBooks, scoredBooks }, index: { loaded, vectors, memoryMb, … }, scraper: { available } }` |
| POST | `/admin/ai/test` | embeds a sample query: `{ ok, model, nativeDimensions, storedDimensions, latencyMs, tokens }` (502/503 on failure) |
| GET | `/admin/settings` | `{ values: { "<key>": value }, definitions: [{ key, group, type, default, min?, max?, maxLength? }] }` |
| PATCH | `/admin/settings` | `{ "<key>": value \| null }` (null = reset to default); all values validated first → same shape as GET |
| GET | `/admin/jobs` | `?type=scraper\|embeddings\|emotions&limit=` → `[{ id, type, status, params, total, processed, failed, message, result, startedBy, startedAt, finishedAt }]`, newest first |
| POST | `/admin/jobs` | `{ type, params }` → 202 job. One job per type at a time (409). Params: scraper `{ fromPage?, toPage? }`; embeddings/emotions `{ scope?: "missing"\|"all", limit? }` |
| GET | `/admin/jobs/:jobId` | one job, with live progress while running |
| POST | `/admin/jobs/:jobId/cancel` | → 202; the job stops after its current step (status `cancelled`) |

Job statuses: `running`, `completed`, `failed`, `cancelled`, `interrupted` (the server restarted mid-run).

### Other
`GET /statistics/listings` (prices, genres, conditions, cities, reservations, favourites), `GET /statistics/books` (genres, prices, stores, the 10 most prolific authors), `GET /statistics/community` (members, ratings and their distribution, best-rated books, forum activity per category, favourite genres),
`GET /statistics/authors?search=&limit=` (per-author price/genre stats, max 25) — all public, cached 5 min ·
`GET /genres` · `GET /features` (`{ recommendations, similarBooks }`: AI recommendations need embeddings and a key, similar books only embeddings) · `GET /health`

---

## Migration guide for the client (old → new)

Base URL changes: everything is now under `/api`. The old `/auth`, `/scraper`, `/statistici` and root-level routes are gone.

| Old | New |
|---|---|
| `POST /auth/check-email`, `POST /auth/check-username` | `POST /api/auth/availability` |
| `POST /auth/register` · `POST /auth/login` | same paths under `/api/auth` (now also return `user`) |
| `GET /auth/getUtilizatorData` | `GET /api/me` |
| `POST /auth/updateUtilizatorDescriere` | `PATCH /api/me` |
| `POST /auth/updateUtilizatorParolaHash` `{oldPassword,newPassword}` | `PUT /api/me/password` `{currentPassword,newPassword}` |
| `POST /auth/uploadImagineProfil` | `PUT /api/me/avatar` |
| `GET /:userId/getImagineProfil` | `avatarUrl` field, or `GET /api/users/:userId/avatar` |
| `GET /:userId/getUtilizatorPreferinte` · `POST /updateUtilizatorPreferinte` | `GET` / `PUT /api/me/favorite-genres` (genre codes) |
| `GET /getProfile/:id` · `/getUserArticles/:id` · `/getUserForums/:id` | `GET /api/users/:id` · `/listings` · `/forums` |
| `GET /generateRecommendationsForProfile` + Python recommender `request-recommendations` | `POST /api/me/recommendations` (with or without `query`; computed in the API) |
| `GET /api/getRecomandariCarti` | `GET /api/me/recommendations` (full book summaries) |
| `POST /api/postCartiIDs` + `POST /api/postCartiData` | `GET /api/books?…` (one call returns the cards) |
| `GET /api/getRandomBooks` | `GET /api/books/random` |
| `GET /api/:id/getCarteImagine` | `coverUrl` field |
| `GET /api/carte/:id` · `/oferte` | `GET /api/books/:id` · `/offers` |
| `GET /api/carte/:id/esteCitita`, `POST …/marcheazaCitita`, `POST …/demarcheazaCitita` | `GET` / `PUT` / `DELETE /api/books/:id/rating` |
| `GET /api/getIstoric` | `GET /api/me/reading-history` |
| `POST /api/bazar/fetchBooksShort` | `GET /api/books/lookup?query=` |
| `GET /api/bazar/getAnuntRights` · `GET /api/getForumRights` | `permissions` in `GET /api/me` |
| `POST /api/bazar/getAnuntIDs` + `POST /api/bazar/getAnunturiData` | `GET /api/listings?…` |
| `POST /api/bazar/createAnunt` (`bookImage`, `anunt*` fields) | `POST /api/listings` (`image`, English fields) |
| `GET /api/bazar/anunt/:id`, `…/sellerData`, `…/:id/checkOwning` | `GET /api/listings/:id` (`seller`, `isOwner`) |
| `GET /api/bazar/:id/getAnuntImagine` | `imageUrl` field |
| `GET /api/bazar/getAnunturileMeleIDs` | `GET /api/me/listings` |
| `GET /api/bazar/anunturiIDs/:carteID` | `GET /api/books/:id/listings` |
| `POST /api/bazar/updateAnunt` · `InchideAnunt/:id` · `StergeAnunt/:id` | `PATCH` · `POST …/close` · `DELETE /api/listings/:id` |
| `POST /api/chat/getChatIDs` + `GET /api/chat/getChatData/:id` | `GET /api/me/chats` · `GET /api/chats/:id` |
| `POST /api/chat/getChatMessagesIDs` + `GET /api/chat/getMesajData/:id` | `GET /api/chats/:id/messages` |
| `GET /api/chat/getMesajMedia/:id` (was public!) | `mediaUrl` → `GET /api/chats/:chatId/messages/:id/media` 🔒 |
| `POST /api/chat/sendMessage` · `/uploadMedia` | `POST /api/chats/:id/messages` · `/media` (field `file`) |
| `GET /api/chat/checkAnuntContactat/:id` · `POST /api/chat/:id/createChat` | `GET /api/listings/:id/chat` · `POST /api/listings/:id/chats` |
| `GET /api/chat/checkIsOpen/:id` · `GET /api/chat/openCloseChat/:id` | `isOpen` in `GET /api/chats/:id` · `PATCH /api/chats/:id {isOpen}` |
| `GET /api/getForumuri` · `GET /api/getUserForumuri` | `GET /api/forums` · `GET /api/me/forums` |
| `POST /api/createForum` | `POST /api/forums` |
| `GET /api/forum/:id` · `/getTitle` | `GET /api/forums/:id/messages` · `GET /api/forums/:id` |
| `POST /api/forum/:id/createMessage` | `POST /api/forums/:id/messages` |
| `POST /api/forum/changeForumTitle` · `toggleForumStatus` | `PATCH /api/forums/:id` |
| `POST /api/raport/creeazaRaport` (`tipObiect` MesajChat/…) | `POST /api/reports` (`targetType` chat_message/…) |
| `POST /api/raport/getReportsIDs` + `getReportData` + `getExtendedReportData` | `GET /api/reports` · `GET /api/reports/:id` |
| `POST /api/raport/closeReport/:id` | `PATCH /api/reports/:id {isOpen:false}` |
| `POST /api/raport/disableRights` (`removedRights` = content type) | `PUT /api/admin/users/:id/permissions/:permission {granted:false}` |
| `POST /api/raport/removeForumMessage/:id` · `deleteObject/:id` | `DELETE /api/admin/forum-messages/:id` · `/admin/listings/:id` · `/admin/forums/:id` |
| `GET /scraper/startScraping` (public) | `POST /api/admin/jobs { type: "scraper" }` 🛡️ |
| `GET /statistici/anunturi` · `/statistici/carti` | `GET /api/statistics/listings` · `/books` |
| `/uploads/<file>` | `/uploads/images/<file>` |
