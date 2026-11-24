# Client: Aurora Codex web app

React single-page app for Aurora Codex. The interface is Romanian; code, file names and comments
are English. It talks only to the API in [`../server`](../server).

## Setup

Requires Node.js 20+ and the API running (default `http://localhost:3000`).

```powershell
copy .env.example .env.local   # VITE_API_URL=http://localhost:3000
npm install
npm run dev                    # http://localhost:5173
```

`VITE_*` variables are compiled into the public bundle: never put secrets in them.

| Script | Purpose |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run build` · `npm run preview` | production build in `dist/` · serve it locally |
| `npm run lint` | ESLint |
| `npm test` · `npm run test:watch` | Vitest + Testing Library |

## Structure

Code is grouped by feature; each feature has `api.js` (requests), `hooks.js` (TanStack Query
queries and mutations), `components/` and `pages/`. Pages only use hooks.

```
src/
├── app/            router (lazy pages, auth/admin guards), paths (Romanian URLs), layout, providers
├── features/
│   ├── auth/            session, sign-in / sign-up, route guards
│   ├── books/           catalogue, book page, ratings, store offers, emotional profile
│   ├── recommendations/ AI recommendations panel, similar books
│   ├── marketplace/     listings, filters, gallery, create/edit, favourites
│   ├── chats/           buyer–seller conversations with attachments
│   ├── forums/          board, categories, threads, posts, editor
│   ├── statistics/      catalogue, marketplace and community charts
│   ├── profile/         account, password and sessions, favourite genres, public profiles
│   ├── reports/         report button and the moderation queue
│   ├── admin/           AI status, background jobs, settings
│   └── home/            landing page and book carousel
└── shared/         UI kit, hooks, fetch wrapper and token store, formatting, query keys, styles, assets
```

Optional features are decided by the server at runtime (`GET /api/features`): AI recommendations
appear once the server has an AI key and book embeddings, similar books once embeddings exist.

## Styling

- **Design tokens** in `shared/styles/tokens.css`: the aurora palette (emerald, teal, violet on
  arctic whites or a polar-night sky), spacing, type, radii, shadows and motion. Dark mode
  redefines the colour tokens under `:root[data-theme='dark']`; an inline script in `index.html`
  applies the theme before the first paint.
- **CSS Modules** next to each component, using tokens instead of raw values.
- **Motion** is mild (drifting aurora glow, page fade-in, wordmark shimmer) and switched off for
  `prefers-reduced-motion`.
- **Fonts** are self-hosted: Nunito (text), Baloo 2 (headings), Mochiy Pop P One (wordmark).
- The logo is `shared/assets/logo.svg`; `public/` holds the same SVG and the PNG icons generated from it.

## Conventions

- User-facing text is Romanian; server errors arrive in English and `getErrorMessage` translates them.
- Filters, sorting and pagination live in the URL (`useSearchParamsState`), so views can be shared.
- While open, the app pings the API's `/health` every 2–4 minutes so a free-tier backend stays awake.

## Deployment

`npm run build` produces a static site in `dist/`. On Vercel, set `VITE_API_URL` and use `client`
as the root directory; `vercel.json` sends every path to `index.html` for client-side routing.
