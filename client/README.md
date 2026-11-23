# Client: Aurora Codex web app

React single-page app for the readers platform. It covers the book catalogue with store price
comparison, AI recommendations, the marketplace ("Bazar") with private chats, forums, reading
history, statistics and an admin moderation queue. The interface is in Romanian; code, file
names and comments are in English.

## Requirements

- Node.js 20+
- The API from [`../server`](../server) running (default `http://localhost:3000`)

## Getting started

```bash
cp .env.example .env.local   # then adjust the values below if needed
npm install
npm run dev                  # http://localhost:5173
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the REST API (no trailing slash needed) |

`VITE_*` values are compiled into the public bundle. Never put secrets in them: API keys (DeepInfra, Google Books) live only in the server's `.env`. `.env` and
`.env.*` files are git-ignored (except `.env.example`).

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` / `npm run preview` | production build in `dist/` / serve that build locally |
| `npm run lint` | ESLint (React, hooks and fast-refresh rules) |
| `npm test` / `npm run test:watch` | Vitest + Testing Library (jsdom) |

## Project structure

The code is organised by feature: everything a screen needs (API calls, React Query hooks,
components, pages, styles) lives together. Shared building blocks live in `shared/`.

```
src/
├── main.jsx                 entry point: global styles, fonts, providers, router
├── app/
│   ├── router.jsx           route table: lazy-loaded pages behind auth/admin/guest guards
│   ├── paths.js             every URL in one place (Romanian slugs; use the helpers)
│   ├── layout/              header, footer, page shell
│   ├── pages/               404 and route error pages
│   └── providers/           React Query, auth, theme (light/dark) and toasts
├── features/
│   ├── auth/                session state, login/register page, route guards, safe redirects
│   ├── books/               catalogue, filters, book page, ratings, store offers, emotion profile
│   ├── recommendations/     AI recommendation panel (keywords + emotional tone)
│   ├── admin/               admin panel: AI status, background jobs, settings
│   ├── marketplace/         listings, create/edit, owner actions, image upload
│   ├── chats/               buyer–seller conversations (polling), attachments
│   ├── forums/              forum list, threads, own forums
│   ├── profile/             account, password, favourite genres, reading history, public profiles
│   ├── reports/             report button and the admin moderation queue
│   ├── statistics/          catalogue and marketplace charts (Recharts) with table views
│   └── home/                landing page
└── shared/
    ├── api/                 fetch wrapper (auth header, errors), token store, query client, messages
    ├── config/env.js        build-time configuration (`VITE_*` variables)
    ├── hooks/               URL-backed filters, debouncing, document title, back navigation…
    ├── lib/                 formatting (ro-RO), JWT helpers, storage, query keys
    ├── ui/                  design-system components (Button, Card, Modal, Field, Pagination…)
    ├── styles/              design tokens and global styles
    └── assets/              logo and illustrations (WebP)
```

Each feature exposes `api.js` (plain request functions) and `hooks.js` (React Query queries and
mutations, including cache invalidation). Pages only talk to hooks.

## Feature flags

Optional features are decided by the server at runtime (`GET /api/features`, see
`useFeatures`). AI recommendations appear once the server has a DeepInfra key and the book
embeddings were generated from the admin panel (`/admin`); no client rebuild is needed.

## Styling

- **Design tokens** (`shared/styles/tokens.css`): colours, spacing, type scale, radii, shadows,
  motion and z-index as CSS custom properties. Dark mode redefines the colour tokens under
  `:root[data-theme='dark']`. A small inline script in `index.html` applies the saved or system
  theme before the first paint, so there is no flash.
- **CSS Modules** (`*.module.css`) next to each component; class names are scoped, so there
  are no global collisions. Components use tokens rather than raw values.
- **Global styles** (`shared/styles/global.css`): a modern reset, base typography, focus
  rings, the `.visually-hidden` helper and reduced-motion support.
- **Fonts** are self-hosted with `@fontsource`: Nunito (body), Baloo 2 (headings) and
  Mochiy Pop P One (brand wordmark only).
- Layouts are responsive down to 360px. Modals become bottom sheets on phones.

## Conventions

- Text shown to users is Romanian; everything else (identifiers, files, API fields, comments)
  is English.
- Filter, sort and pagination state that should survive reloads or be shareable is kept in the
  URL (`useSearchParamsState`).
- Server errors arrive in English. `getErrorMessage` turns them into Romanian messages for
  toasts.
- While the app is open it pings the API's `/health` every 2–4 minutes (`shared/api/keep-alive.js`), so a free-tier backend doesn't fall asleep between visits.
- Images use `FadeImage`: lazy loading, a shimmer placeholder, and a fade-in once loaded.

## Deployment

`npm run build` outputs a static site in `dist/`. `vercel.json` rewrites every path to
`index.html` so client-side routes work on refresh. Set the `VITE_*` variables in the hosting
provider before building.
