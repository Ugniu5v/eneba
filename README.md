# Eneba-style marketplace

A full-stack digital-games marketplace built for the Eneba internship assignment:
a catalog of games, gift cards and software with multi-seller offers, fuzzy
search, a data-driven homepage, authentication, a simulated checkout and
instantly delivered digital keys.

The interface follows Eneba's visual language: vivid purple, Metropolis-style
geometry, flat dark product cards, yellow purchase actions and dense
merchandising sections. It is an independent demo and is **not affiliated with
Eneba**.

<p align="center">
  <img src="./docs/screenshots/home.jpg" alt="Marketplace homepage" width="100%" />
</p>

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide icons |
| Backend | Go 1.26, `net/http`, SQLite via `modernc.org/sqlite` or PostgreSQL (Supabase) via `DATABASE_URL` |
| Auth | HTTP-only session cookies, bcrypt password hashes |
| Payments | Simulated card processor with deterministic test cards |
| Tests | Go unit + HTTP integration tests; browser QA via Playwright |
| Delivery | Docker Compose, Next.js standalone output, Vercel (Go function + Next.js) and Render |

## Quick start

Requirements: **Go 1.26+**, **Node.js 20.9+** (22 recommended) and npm.
SQLite is embedded — there is no database server to install. To use a hosted
PostgreSQL database instead, set `DATABASE_URL` to the Supabase connection
string (direct or transaction pooler); the same schema and demo seed are created
on first start. See [Supabase Postgres](#database--supabase-postgres-direct-or-transaction-pooler).

`cmd/api` loads `backend/.env` on start, so the connection string (and its
password) can live in that git-ignored file instead of your shell. Real
environment variables always win, which is how Vercel and Render inject secrets.

```bash
# terminal 1 — API on http://localhost:8080
cd backend
cp .env.example .env      # optional: paste DATABASE_URL into .env for Supabase
go run ./cmd/api

# terminal 2 — web app on http://localhost:3000
cd frontend
npm install
npm run dev
```

Or run both from the repository root with `make dev`.

The API seeds `backend/data/eneba.db` on first start with 214 products (every
currency gift-card denomination is its own SKU), multiple seller offers,
inventory keys, homepage blocks, banners and one demo account with a sample
delivered order. Existing demo databases receive the new SKUs additively on
startup, so accounts, orders and sold keys survive the upgrade.

### Demo access

| What | Value |
| --- | --- |
| Email | `demo@eneba.test` |
| Password | `Demo1234!` |
| Successful test card | `4242 4242 4242 4242`, any future expiry, any 3-digit CVC |
| Declined test card | `4000 0000 0000 0002` |

No real payment is ever made. Card data is validated, then discarded; only the
last four digits are stored on the order.

## What is implemented

- **Store catalog** — every product is browsable with URL-addressable filters for
  category, platform, region, product type, genre and price. Facet counts adapt
  to the active filters, so each option shows how many products would remain.
  Filters live in the left sidebar (price range plus collapsible Category,
  Platform, Region, Product type and Genre groups) and on mobile in a filter
  sheet. As soon as a group has an applied value, it also appears as a bubble
  above the results — only applied groups get a bubble, and tapping one opens a
  dropdown anchored to it with a search field, live facet counts, checkboxes
  and a clear-all action. On small screens that dropdown becomes a bottom sheet.
  Sorting uses a custom accessible menu (relevance, popularity, price, rating,
  release date and discount).
- **Backend-driven homepage** — the landing page contains independent blocks:
  banners, category rail, recommended products, top games, deals, gift cards and
  new releases. Each block fetches its own API endpoint, renders its own loading
  skeleton and retries/fails independently. No product content is hardcoded in
  the frontend. Merchandising blocks are horizontal sliders with scroll-snap and
  arrow controls on desktop; every slider has a “Show all” button underneath
  that opens the store with that block’s filters. Every product card shares the
  same animated hover preview (subtitle, rating, seller-offer count and a link to
  offers). The gift-card shelf shows one representative denomination per
  platform so it stays a merchandising rail; every denomination is still its own
  store product and search result. The header category strip never scrolls or clips a label — it shows
  the categories that fit and leaves the rest to the categories drawer — while
  the homepage category rail pages through whole tiles with one arrow on each
  outer edge (no half-visible tile). The homepage ends with the full 18-genre
  game category directory.
- **Typo-tolerant search** — global search in the header from any page, with a
  keyboard-navigable autocomplete dropdown. The Go scorer combines exact,
  prefix, substring, token coverage and Levenshtein edit distance so
  `neon drfit`, `crownfll`, `terrablo` and similar queries resolve correctly.
  Gift-card amounts are part of the product name, so `steam wallet 5`,
  `nintendo eshop 35` or `playstation 50` each resolve to that exact
  denomination’s product page.
- **Product pages** — cover art, description, features, release metadata, rating
  and **multiple offers from different sellers** with seller rating, reviews,
  stock, region, delivery and price comparison. A recommended-seller panel
  highlights the highest-rated in-stock offer, and each seller row reveals its
  add-to-cart action with a slide-in on hover or keyboard focus. Every currency gift-card
  denomination is a separate catalog product with its own slug, title, cover,
  seller offers and search result (for example `steam-wallet-5-eur`,
  `steam-wallet-50-eur`, `steam-wallet-100-eur`). Each page therefore describes
  exactly one amount; only the brand’s original denomination carries the sale
  badge, while generated denominations are regular-priced. The page still shows
  the full 5–100 value grid, but every tile is a link to that amount’s own
  product page and the current amount is highlighted. The cart and order line
  identify the SKU itself.
- **Cart and simulated checkout** — a persistent, stock-aware cart, quantity
  limits, buyer-protected signed-in checkout, card validation and simulated
  failure for the `0002` test card. After a successful payment the API withholds
  the digital key codes until the buyer confirms that each order's platform and
  region match the account they will redeem on; the confirmation window (and
  the order page, if it is dismissed) stays locked until then. The confirmation
  endpoint is the only place key codes are released.
- **Digital key delivery** — checkout runs in a single database transaction:
  prices are resolved server-side, unique inventory keys are reserved, stock is
  decremented and keys are attached to the order. The key is visible
  immediately on the order page and in order history.
- **Cashback wallet** — every delivered order earns the product's cashback
  percentage into an append-only ledger. The account area has a dedicated
  cashback page with the live balance, lifetime earned/used totals and the full
  colour-coded history, each row linking back to its order. At checkout the
  buyer can tick one box to spend the whole available balance; the server
  validates it against the ledger inside the same transaction, caps it at the
  order subtotal and shows the applied and newly earned amounts on the receipt.
- **Authentication and account hub** — register, log in, log out and session
  restoration. A dedicated account area contains editable profile details, order
  history, a copyable key library, order-linked cashback history and the wish
  list. Checkout and account pages are account-only; the Go API enforces this
  independently of the UI.
- **Wish list** — a heart action on every product, a counted top-bar entry and a
  saved-products page, persisted locally per browser.
- **Language and currency** — English/Lithuanian UI copy and EUR/USD/GBP display
  prices. Preferences persist in first-party cookies so the server-rendered page
  arrives in the chosen language without a flash; the top bar adapts down to
  320 px with icon-only actions, a second-row search and a category drawer. The
  drawer lists every category with live product counts (price filtering lives on
  the store page); account links live only in the profile dropdown.
- **Eneba styling** — locally bundled Metropolis webfonts, extracted color/spacing
  tokens, Eneba-like header/search, category rail, product cards, mega-sale
  banners, yellow CTAs, footer and responsive mobile layouts. The catalogue has
  been expanded to 214 products across 18 canonical game genres, gift cards with
  one product per denomination, and software.
- **Complete submission trail** — [`docs/agent-chat-log.md`](./docs/agent-chat-log.md)
  records the agent conversation, decisions, commands, HTTP checks and test
  results. API reference: [`docs/API.md`](./docs/API.md).

## Screens

| Store | Product |
| --- | --- |
| ![Store catalog](./docs/screenshots/store.jpg) | ![Product page with offers](./docs/screenshots/product.jpg) |

### Store filter dropdowns

The sidebar holds every filter group; applied groups also get a bubble that
opens a dropdown with a search field, live facet counts, checkboxes and a
clear-all action (a bottom sheet on small screens).

![Store filter dropdowns](./docs/screenshots/store-filters.jpg)

### Gift card denominations

Currency gift cards are split into one catalog product per amount, from 5 to 100
in 5-unit steps. Each amount has its own slug, cover, seller offers and search
result, so a shopper can search for `Steam Wallet Card 5 EUR` directly. The
product page still shows the amount grid: every tile is its own product link
with that amount’s price, and the tile matching the current page is highlighted.
The cart and order use the denomination SKU directly.

![Gift card denomination page](./docs/screenshots/gift-card.jpg)

### Product hover preview

![Animated product hover preview](./docs/screenshots/hover.jpg)

### Game categories at the bottom of the homepage

![Game category directory](./docs/screenshots/categories.jpg)

| Orders & digital keys | Mobile login |
| --- | --- |
| ![Orders](./docs/screenshots/orders.jpg) | ![Mobile sign in](./docs/screenshots/mobile-login.jpg) |

## Architecture

```
Browser
  │
  ├─ Next.js App Router UI (React server/client components)
  │    └─ /api/[...path] BFF proxy (same-origin cookies, runtime BACKEND_URL)
  │
  └─ Go REST API (:8080)
       ├─ HTTP handlers + middleware (CORS, recovery, request logging)
       ├─ store repository / checkout transaction
       ├─ fuzzy search scorer
       ├─ simulated payment adapter
       └─ SQLite (WAL) or PostgreSQL ── products, offers, inventory, users,
                          sessions, banners, categories, homepage sections,
                          orders, keys
```

The Next.js route handler is a thin backend-for-frontend proxy. It exists so the
browser only talks to one origin in every environment (local, Docker, Vercel,
Render), while cookies remain first-party. It does not contain marketplace
content or business logic.

### Homepage blocks

`GET /api/storefront/home/sections` returns descriptors, each with its own
`apiPath`. The browser then requests those URLs separately:

| Block | Endpoint | Data source |
| --- | --- | --- |
| Promo banners | `/api/storefront/home/banners` | `banners` table |
| Category rail | `/api/storefront/home/categories` | `categories` table |
| Recommended | `/api/storefront/home/sections/recommended` | featured products |
| Top games | `/api/storefront/home/sections/top-games` | games ranked by popularity |
| Deals | `/api/storefront/home/sections/deals` | offers ranked by discount |
| Gift cards | `/api/storefront/home/sections/gift-cards` | gift-card catalogue |
| New releases | `/api/storefront/home/sections/new-releases` | new/upcoming products |

Each section still has independent loading, error and retry states in the UI, so
one failing block does not take down the homepage.

### Checkout transaction

1. The browser posts offer IDs and quantities plus test card fields.
2. The Go API authenticates the session, validates the simulated payment and
   resolves every price from the database — never trusts client totals.
3. A database transaction locks in available inventory, creates the order and order
   items, marks unique product keys as sold, and copies them to the order.
4. The response contains the order, but not the key codes: the frontend clears
   the cart and shows the confirmation window. The buyer confirms the platform
   and region, and only the confirmation endpoint returns the keys.

This makes double-spend of a digital key impossible inside a successful order,
and keeps key codes off the wire until the buyer acknowledges the region.

### Search

The catalog is small enough to score in Go, which gives better fuzzy behaviour
than SQL `LIKE`. The scorer handles exact matches, phrase/prefix/substring
matches, token coverage, and bounded Levenshtein distance per token. Duplicate
typos in multiple words are allowed. At larger catalog scale, the same interface
can be backed by SQLite FTS5 or a dedicated search service.

## Project layout

```
.
├── backend/
│   ├── cmd/api/                 # API entrypoint, graceful shutdown
│   ├── internal/catalog/        # embedded seed catalog JSON
│   ├── internal/database/       # SQLite/PostgreSQL open, migrate, seed, schemas
│   ├── internal/httpapi/        # routes, auth, storefront, checkout handlers + tests
│   ├── internal/payment/        # simulated card processor + tests
│   ├── internal/search/         # typo-tolerant fuzzy search + tests
│   ├── internal/store/          # models, repository and transactional orders
│   └── third_party/lib-pq/      # pinned PostgreSQL driver (BSD licensed)
├── frontend/
│   ├── src/app/                 # App Router pages, /account routes and /api BFF proxy
│   ├── src/components/          # header, cards, filters, product, checkout, orders, account
│   ├── src/context/             # auth, cart, wish list, preferences and toast providers
│   ├── src/hooks/               # cancellable API query and debounce hooks
│   ├── src/lib/                 # types, formatting, taxonomy, i18n and API client
│   ├── public/assets/           # locally generated SVG cover art + Metropolis fonts
│   └── Dockerfile
├── docs/                        # API docs, screenshots and full agent chat log
├── scripts/generate-assets.mjs  # regenerates all original cover/banner art
├── scripts/dev.sh
├── docker-compose.yml
└── Makefile
```

## Testing

```bash
# Go unit + HTTP integration tests (health, home blocks, typo search,
# filters, auth, declined payment, successful checkout, key delivery, orders)
cd backend && go test ./...

# PostgreSQL schema/seed/catalogue smoke test against a disposable database
docker run --rm -d --name eneba-pg -e POSTGRES_PASSWORD=eneba -p 5432:5432 postgres:17
TEST_DATABASE_URL='postgres://postgres:eneba@localhost:5432/postgres?sslmode=disable' \
  go test ./internal/database -run TestPostgresBackend -v
docker rm -f eneba-pg

# TypeScript and lint
cd frontend
npm run typecheck
npm run lint

# Production build
npm run build
```

The browser QA pass exercised these flows against the production build:
homepage blocks, header autocomplete, typo search, catalog filter + sort,
product offers, add to cart, demo login, checkout with test card, digital key
display and order history. There were no console errors.

## Docker

```bash
docker compose up --build
# web:  http://localhost:3000
# api:  http://localhost:8080
```

SQLite is persisted in the `eneba-data` volume. Setting `DATABASE_URL` switches
the API to PostgreSQL (for example Supabase) and makes the volume unnecessary.
Set `COOKIE_SECURE=true` when serving over HTTPS behind a TLS reverse proxy. For
a public demo, a single Docker host (or any Docker platform) provides one URL
and avoids cross-site cookie complications.

## Deploying

### Database — Supabase Postgres (direct or transaction pooler)

Set `DATABASE_URL` to the connection string from Supabase's **Connect** dialog
(or Project Settings → Database → Connection string), using the **URI** format.
`DATABASE_URL` takes precedence over `DB_PATH`; without it the API keeps using
SQLite.

| Connection type | Port | Notes |
| --- | --- | --- |
| Direct connection | 5432 | `db.<project-ref>.supabase.co`; needs IPv6 on some networks. |
| Transaction pooler | 6543 | `aws-0-<region>.pooler.supabase.com`; best for IPv4-only hosts and scaled-down instances. |
| Session pooler | 5432 | Same pooler host; useful when a client needs session state. |

```bash
# Direct connection (port 5432)
export DATABASE_URL='postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres'

# Transaction pooler (port 6543)
export DATABASE_URL='postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres'
```

- Replace `<password>` with the database password. If it contains URL-reserved
  characters, paste the percent-encoded URL the dashboard shows.
- `sslmode=require` is added automatically for `*.supabase.com`,
  `*.supabase.co` and `*.supabase.net` hosts; an explicit `sslmode` is kept.
- The transaction pooler does not support prepared statements that outlive a
  transaction. The backend's driver (`lib/pq`) uses unnamed statements, so both
  direct and transaction-pooler URLs work without extra DSN flags.
- `connect_timeout=10` is added unless the URL already sets one, so a bad URL
  fails fast instead of hanging startup.
- For a local PostgreSQL server without TLS, append `?sslmode=disable` (lib/pq
  otherwise requires TLS).
- Keep the API and the Supabase project in the same region.
- **Serverless hosts (Vercel, Lambda) should use the transaction pooler**
  (port 6543): each warm instance opens its own few connections, and Supavisor
  multiplexes them. The API shrinks its pool to 3 connections on Vercel and
  accepts `DB_MAX_OPEN_CONNS` / `DB_MAX_IDLE_CONNS` overrides.
- Put the URL in `backend/.env` for local runs; hosted platforms should set it
  as a dashboard environment variable instead (nothing from `.env` is uploaded —
  `backend/.vercelignore` excludes it).
- The first start creates the schema and seeds the demo catalogue, demo account
  and inventory; later starts reuse the data. On Vercel seeding is skipped by
  default because cold starts have a short budget — seed the database once from
  your machine with `make seed` (see below).

### Option A — one public URL with Docker

Deploy `docker-compose.yml` (or the two images) to a Docker-capable host,
terminate HTTPS in front of port 3000, and set:

- backend: `FRONTEND_URL=https://your-domain`, `COOKIE_SECURE=true`
- frontend: `BACKEND_URL=http://backend:8080`

### Option B — Vercel for both (Go function + Next.js)

The backend deploys as a Vercel Function: `backend/vercel.json` sets the **Go**
framework preset, which detects `go.mod` + `cmd/api/main.go`, builds the server
and routes every request to it on `$PORT`. No handler wrapper is needed.

1. **Backend project:** import the repository with **Root Directory `backend`**.
   Vercel reads `vercel.json` and presets *Go*. Set these environment variables
   (Project Settings → Environment Variables):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **transaction pooler** URI, port 6543 |
   | `FRONTEND_URL` | `https://<frontend-project>.vercel.app` |
   | `COOKIE_SECURE` | `true` |
   | `CORS_ORIGINS` | `https://<frontend-project>.vercel.app` (optional; `FRONTEND_URL` already allows it) |

   Optional: set the function region closest to Supabase (Project Settings →
   Functions → Region), e.g. Frankfurt `fra1` for an EU project.

2. **Seed once** (the deploy leaves an empty database empty on purpose, because
   cold starts are short):

   ```bash
   cd backend
   # DATABASE_URL in .env, or prefix the command
   make -C .. seed          # or: go run ./cmd/api -seed
   ```

   It prints `database seeded` and exits; running it again reports
   `database already seeded`.

3. **Frontend project:** import the repository with **Root Directory
   `frontend`** and add `BACKEND_URL=https://<backend-project>.vercel.app` as a
   server-side variable (not `NEXT_PUBLIC_`). The BFF proxy keeps browser calls
   same-origin, so session cookies stay first-party.

4. **Verify:** `curl https://<backend-project>.vercel.app/api/health` returns
   `{"database":"ok","service":"eneba-market-api","status":"ok"}`. A `503` with
   `"database":"unreachable"` means `DATABASE_URL` is wrong or the Supabase
   project is paused.

Notes:

- Vercel functions have no persistent disk, so SQLite is refused with an
  explicit error when `DATABASE_URL` is missing. That is intentional: a
  read-only `/tmp` database would silently lose accounts and orders.
- Every cold start re-runs the idempotent migration (a few dozen statements) and
  skips seeding, so it stays within the function budget.
- `backend/.vercelignore` keeps `data/`, `.gocache/`, `bin/` and `.env` out of
  the uploaded function; only `third_party/` (the in-tree drivers) ships with
  the code.
- The Go runtime is in beta at Vercel; if the *Go* preset is unavailable on your
  plan, deploy the same directory as a Docker image (Option A) instead.

### Option C — Vercel frontend + Render backend

1. **Backend on Render:** create a Web Service from `backend/` using the
   Dockerfile. Set `FRONTEND_URL` to your Vercel URL, `COOKIE_SECURE=true` and
   `DATABASE_URL` to your Supabase connection string. With PostgreSQL no disk is
   needed; if you keep SQLite instead, mount a persistent disk at `/app/data` so
   it survives deploys. Render's free tier can sleep, so first requests may be
   slow.
2. **Frontend on Vercel:** import the repo with root directory `frontend`. Add
   `BACKEND_URL=https://your-render-service.onrender.com` as a server-side env
   var (not `NEXT_PUBLIC_`). Vercel builds with Next.js and the BFF proxy keeps
   browser calls same-origin.

No deployment URL or GitHub remote is included in this working directory because
no hosting or repository credentials were provided. All configuration needed to
create them is present.

## Scope notes

- Payment is intentionally simulated; there is no payment-provider SDK and no
  real money.
- Keys are generated demo inventory, not real platform keys.
- Email delivery is described as a production extension; in the demo, keys are
  delivered on the order page and private order history.
- The demo is single-node. SQLite is the zero-setup default and PostgreSQL
  (Supabase) is supported through `DATABASE_URL`. A production marketplace would
  add rate limiting, email verification, password reset, structured
  observability, idempotency keys for payment retries, and FTS/Elasticsearch for
  scale.
- "Eneba" is used only as the design brief. This project is independent and not
  affiliated with Eneba or any listed platform.

## Useful commands

| Command | Purpose |
| --- | --- |
| `make dev` | Run Go API + Next.js dev server together |
| `make test` | Go tests, TypeScript check and ESLint |
| `make seed` | Seed a (Supabase) database once, then exit |
| `make build` | Backend compile + Next.js production build |
| `node scripts/generate-assets.mjs` | Regenerate cover, banner and brand art |
| `docker compose up --build` | Self-contained production stack |
