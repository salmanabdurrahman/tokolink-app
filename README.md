<div align="center">
  <img src="public/favicon.svg" alt="Tokolink OSS Logo" width="120" height="120" />

# Tokolink

**Open-source link-in-bio storefront and WhatsApp catalog platform for Indonesian MSMEs**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?style=flat)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)

</div>

## Overview

**Tokolink** is a multi-tenant Software-as-a-Service platform for Indonesian micro, small, and medium businesses (UMKM/MSMEs). It combines a link-in-bio landing page, product catalog, variant-based cart, and WhatsApp checkout into one lightweight storefront.

Each merchant gets a public storefront at `tokolink-v2.vercel.app/{store-slug}`. Customers can browse links and products, choose variants, add items to a client-side cart, then send a clean, structured order message directly to the merchant's WhatsApp number.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Project Patterns](#project-patterns)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Repository Structure](#repository-structure)
- [Testing](#testing)
- [Security](#security)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Instant storefront onboarding** — create a store slug, profile, avatar, tagline, and WhatsApp contact.
- **Link-in-bio + product catalog** — combine external links and product cards in one mobile-first public page.
- **Variant-aware catalog** — model product options such as size, color, grind type, or add-ons with price deltas.
- **Optional stock tracking** — opt in per product to track/limit stock; checkout blocks oversell and the storefront shows a sold-out state.
- **Physical or digital products** — set per-product shipping weight (gram) for accurate ongkir, or mark a product as digital (e-book, voucher, jasa) to skip shipping: digital items carry no weight and a digital-only cart hides the address/ongkir step at checkout.
- **Product categories** — group products for storefront navigation and filtering.
- **Commerce-ready data model** — store customers, orders, order item snapshots, Pakasir payment records, shipping fields, ledger entries, and withdrawal requests.
- **Client-side cart** — keep checkout fast without forcing customers into account creation.
- **WhatsApp order generator** — convert cart items, variants, quantities, notes, and total price into a structured `wa.me` message.
- **Merchant dashboard** — manage store settings, links, products, categories, stock, weight, digital/physical type, images, and product variants.
- **SEO and social previews** — route-level metadata, canonical URLs, sitemap, robots.txt, JSON-LD, and dynamic OG images.
- **Open-source foundation** — built with modern TypeScript, React, TanStack Start, Prisma, and Supabase Auth.

## Tech Stack

| Area           | Tools                                                                             |
| -------------- | --------------------------------------------------------------------------------- |
| Runtime/build  | Bun, Vite, Vinxi, Nitro preset for Vercel                                         |
| App framework  | React 19, TanStack Start, TanStack Router                                         |
| Data fetching  | TanStack Router loaders, TanStack Start Server Functions, TanStack Query provider |
| State          | Zustand stores for auth, tenant data, and cart state                              |
| Styling        | Tailwind CSS v4, CSS variables, custom Tokolink design tokens                     |
| UI             | Local UI primitives, `cn()` class merging, Lucide icons, Sonner toasts            |
| Motion         | Framer Motion for small, purposeful transitions                                   |
| Database       | PostgreSQL with Prisma ORM                                                        |
| Auth           | Supabase Auth with email OTP and Google OAuth support                             |
| Media          | Cloudflare R2 uploads with server-side image validation and legacy Blob dual-read |
| Email          | Resend verification and welcome emails                                            |
| Bot protection | Server-side rate limits; Cloudflare Turnstile helper pending end-to-end wiring    |
| Tests          | Vitest, Testing Library, jsdom, V8 coverage                                       |

## How It Works

1. Merchant signs up and authenticates through Supabase.
2. `useSession()` syncs Supabase session data into the Prisma-backed user record.
3. Merchant completes onboarding and creates one tenant/store.
4. Dashboard routes load tenant data and store it in Zustand.
5. Protected Server Functions validate input with Zod, enforce auth middleware, and check tenant ownership before writes.
6. Public storefront route loads tenant data by slug and renders links, products, variants, and cart UI.
7. Checkout builds a localized WhatsApp order URL with item lines and total IDR price.
8. Paid orders create ledger entries for merchant balance, platform fee, and withdrawal eligibility. See [payout policy](docs/payout-policy.md).

## Project Patterns

Tokolink uses consistent patterns across routing, server logic, data access, state, tests, and UI. New work should follow these patterns instead of inventing parallel structures.

### Routing

- Routes live in `src/routes` and use TanStack Router file-based routing.
- Pages use `createFileRoute(...)`.
- Route metadata belongs in each route's `head` function.
- Data needed before render belongs in route loaders when possible.
- `src/routeTree.gen.ts` is generated and should not be manually edited.

### Server logic

- Server actions live in `src/server/*.functions.ts`.
- Use `createServerFn({ method })` for RPC-style server functions.
- Validate all incoming data with Zod schemas from `src/lib/schemas.ts` or local route-specific schemas.
- Protected mutations must use `authMiddleware`.
- Tenant-scoped writes must verify ownership with `tenantId` before update/delete.
- Multi-step relational updates should use Prisma transactions.

### State

- Shared client state lives in `src/lib/store.ts`.
- Keep auth, tenant, and cart responsibilities separated.
- Store actions call Server Functions and update local state immutably.
- Derived cart behavior stays in store helpers such as `totalQty()`, `totalPrice()`, and `buildWhatsAppUrl()`.

### UI and styling

- Reuse local primitives from `src/components/ui` before adding new controls.
- Use `cn()` from `src/lib/utils.ts` for conditional Tailwind classes.
- Use design tokens from `src/styles.css`: `background`, `foreground`, `surface`, `card`, `muted`, `border`, `accent`, `destructive`, and related semantic colors.
- Keep visual style aligned with the current brand: warm mono palette, black foreground, lime accent, rounded cards/buttons, subtle borders, mobile-first spacing, and display typography.
- Prefer small purposeful motion with Framer Motion where existing screens already use it.
- Preserve Indonesian user-facing copy unless a feature explicitly targets another locale.

## Prerequisites

- [Bun](https://bun.sh/) recommended, or Node.js 18+
- PostgreSQL database, or Supabase PostgreSQL project
- Supabase Auth project
- Cloudflare R2 bucket and API token
- RajaOngkir API key for domestic destination search and shipping cost
- Resend API key
- Cloudflare Turnstile keys

## Local Setup

### 1. Clone repository

```bash
git clone https://github.com/MastayY/tokolink-app
cd tokolink-app
```

### 2. Install dependencies

```bash
bun install
```

Alternative:

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill `.env` with local database, Supabase, Cloudflare R2, RajaOngkir, Resend, and Turnstile credentials.

### 4. Prepare database

```bash
bun run db:generate
bun run db:push
```

Schema updates add auth abuse, media metadata, commerce order/payment/ledger tables, tenant shipping settings, product weight, and the `Product.isDigital` physical/digital flag. Run `bun run db:push` locally after pulling schema changes.

Database workflow:

- `DATABASE_URL` is used by the runtime Prisma adapter. Must be the Supabase transaction pooler URL (port `6543`, `pgbouncer=true`) so serverless invocations reuse a shared pooled connection budget instead of exhausting Postgres connections.
- `DIRECT_URL` is used by Prisma CLI through `prisma.config.ts` for direct generate/migrate/push/seed workflows (port `5432`, no pgbouncer). Never point runtime app traffic at it.
- `DATABASE_POOL_MAX` caps the Prisma pool size per app instance (default `3`); keep it small in serverless so concurrent warm instances don't overshoot the pooler's connection limit.
- The Prisma client is a global singleton (`src/db.ts`) reused across invocations in every environment, including production, and `GET /api/health` reports `checks.dbLatencyMs` as a lightweight connection signal.
- Use `bun run db:push` for disposable local prototyping.
- Use `bun run db:migrate` when schema changes should be captured as a durable migration.
- Use deploy-time Prisma migrate commands against `DIRECT_URL`; never run destructive reset against production.

Create/apply a local migration when needed:

```bash
bun run db:migrate
```

Reload demo data after schema changes:

```bash
bun run db:seed
```

Wipe all table data back to zero (keeps schema and migration history). Runs a
dry-run by default; pass `--yes` to actually truncate. Use `db:reset-seed` to
wipe then reseed in one step:

```bash
bun run db:reset-data        # dry-run preview
bun run db:reset-data --yes  # truncate every table
bun run db:reset-seed        # truncate + reseed demo data
```

### 5. Start development server

```bash
bun run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable                      | Purpose                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                | Runtime PostgreSQL connection URL, Supabase pooler port 6543 with `pgbouncer=true`         |
| `DIRECT_URL`                  | Direct PostgreSQL URL (port 5432) for Prisma CLI generate/migrate/push/seed workflows      |
| `DATABASE_POOL_MAX`           | Optional, max Prisma pool connections per instance (default `3`)                           |
| `VITE_SUPABASE_URL`           | Public Supabase project URL for browser client                                             |
| `VITE_SUPABASE_ANON_KEY`      | Public Supabase anon key for browser client                                                |
| `SUPABASE_URL`                | Server-side Supabase project URL                                                           |
| `SUPABASE_ANON_KEY`           | Server-side Supabase anon key                                                              |
| `SUPABASE_SERVICE_ROLE_KEY`   | Server-side Supabase admin key; keep secret                                                |
| `OTP_HASH_SECRET`             | Server-side HMAC secret for OTP hashes; keep secret                                        |
| `BLOB_READ_WRITE_TOKEN`       | Legacy Vercel Blob token for rollback/migration only                                       |
| `R2_ACCOUNT_ID`               | Cloudflare account ID for R2 S3-compatible endpoint                                        |
| `R2_ACCESS_KEY_ID`            | R2 access key ID; keep secret                                                              |
| `R2_SECRET_ACCESS_KEY`        | R2 secret access key; keep secret                                                          |
| `R2_BUCKET`                   | R2 bucket name for public media uploads                                                    |
| `R2_PUBLIC_BASE_URL`          | Public R2 custom domain/base URL for uploaded media                                        |
| `VITE_TURNSTILE_SITE_KEY`     | Public Cloudflare Turnstile site key                                                       |
| `TURNSTILE_SECRET_KEY`        | Server-side Turnstile secret key; keep secret                                              |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Optional comma-separated Turnstile hostname allowlist                                      |
| `PAKASIR_PROJECT_SLUG`        | Pakasir project slug for checkout/payment URLs                                             |
| `PAKASIR_API_KEY`             | Pakasir API key for server-side transaction checks; keep secret                            |
| `PAKASIR_BASE_URL`            | Optional Pakasir base URL, defaults to `https://app.pakasir.com`                           |
| `SITE_URL`                    | Server-side public app URL used for Pakasir redirect/webhook links                         |
| `VITE_PUBLIC_SITE_URL`        | Browser-exposed public app URL for canonical links, OG, sitemap, email links               |
| `VITE_SITE_URL`               | Legacy browser-exposed public app URL fallback                                             |
| `RAJAONGKIR_API_KEY`          | RajaOngkir API key for server-side destination, cost, and waybill calls; keep secret       |
| `RAJAONGKIR_BASE_URL`         | Optional RajaOngkir base URL, defaults to `https://rajaongkir.komerce.id/api/v1`           |
| `RESEND_API_KEY`              | Resend API key; keep secret                                                                |
| `RESEND_SENDER_EMAIL`         | Verified sender identity for email delivery                                                |
| `OPENAI_API_KEY`              | OpenAI-compatible API key for AI product copy/sales insight; keep secret; optional feature |
| `OPENAI_BASE_URL`             | Optional OpenAI-compatible base URL, defaults to `https://api.openai.com/v1`               |
| `OPENAI_MODEL`                | Optional model name, defaults to `gpt-4o-mini`                                             |

Never commit real `.env` files or production credentials.

## Available Scripts

| Script                      | Description                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bun run dev`               | Start Vite development server                                                                                    |
| `bun run build`             | Build production app                                                                                             |
| `bun run build:dev`         | Build in development mode                                                                                        |
| `bun run preview`           | Preview built app                                                                                                |
| `bun run lint`              | Run ESLint and Prettier rule checks                                                                              |
| `bun run typecheck`         | Run TypeScript typecheck without emit                                                                            |
| `bun run test`              | Run Vitest once                                                                                                  |
| `bun run test:watch`        | Run Vitest in watch mode                                                                                         |
| `bun run test:coverage`     | Run Vitest with coverage                                                                                         |
| `bun run check`             | Run lint, typecheck, test, and build in sequence                                                                 |
| `bun run format`            | Format repository with Prettier                                                                                  |
| `bun run db:generate`       | Generate Prisma client                                                                                           |
| `bun run db:push`           | Push Prisma schema to database                                                                                   |
| `bun run db:migrate`        | Create/apply local Prisma migration                                                                              |
| `bun run db:studio`         | Open Prisma Studio                                                                                               |
| `bun run db:seed`           | Run database seed script                                                                                         |
| `bun run db:reset-data`     | Wipe all table data (keeps schema/migrations); dry-run unless passed `--yes`                                     |
| `bun run db:reset-seed`     | Wipe all table data then reseed demo data (`reset-db --yes` + `db:seed`)                                         |
| `bun run media:migrate:r2`  | Dry-run legacy Blob media inventory for R2 migration                                                             |
| `bun run db:pool-load-test` | Local concurrent-query load check against the Supabase pooler                                                    |
| `bun run data:cleanup-auth` | Retention sweep: delete expired auth-rate-limit buckets, audit logs, verification codes, and old canceled orders |

## Repository Structure

```text
tokolink-app/
├── prisma/                  # Prisma schema and database model definitions
├── public/                  # Static assets, favicon, manifest, OG assets
├── src/
│   ├── components/          # UI components grouped by feature/surface
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── landing/         # Marketing landing-page sections
│   │   ├── layout/          # Shared layout/navigation components
│   │   ├── motion/          # Reusable motion helpers
│   │   ├── storefront/      # Public storefront components
│   │   └── ui/              # Local UI primitives
│   ├── hooks/               # Client hooks for auth/session/device behavior
│   ├── lib/                 # Utilities, schemas, stores, Supabase clients, OG helpers
│   ├── routes/              # TanStack Router file routes and API routes
│   ├── server/              # Server Functions, auth middleware, email, upload, Turnstile
│   ├── test/                # Test setup and reusable factories
│   ├── db.ts                # Prisma client singleton
│   ├── router.tsx           # Router setup
│   ├── server.ts            # Server entrypoint
│   ├── start.ts             # TanStack Start middleware setup
│   └── styles.css           # Tailwind CSS v4 entrypoint and design tokens
├── components.json          # shadcn-style alias and UI config
├── eslint.config.js         # ESLint + Prettier config
├── vite.config.ts           # Vite/TanStack Start/Nitro config
└── vitest.config.ts         # Vitest config
```

## Testing

GitHub Actions runs lint, typecheck, coverage tests, build, coverage artifact upload, and a basic secret scan on pull requests and pushes to `master`/`main`.

Run quality checks before opening a pull request:

```bash
bun run typecheck
bun run lint
bun run test
```

Run coverage when changing server logic, data access, validation, or store behavior:

```bash
bun run test:coverage
```

Testing conventions:

- Tests live near source files as `*.test.ts` / `*.test.tsx`.
- Shared factories live in `src/test/factories.ts`.
- Global test setup lives in `src/test/setup.ts`.
- Mock Prisma and external services for server-function tests.
- Cover ownership guards, validation failures, transactions, and cart/order formatting.

## Media migration

New uploads are stored in R2. Existing Vercel Blob image URLs remain accepted for storefront and OG rendering until migration completes.

Inventory legacy media without changing data:

```bash
bun run media:migrate:r2
```

Apply migration only after R2 env and public domain are verified:

```bash
bun run media:migrate:r2 -- --apply
```

The script downloads legacy Blob URLs from `Tenant.avatar` and `Product.image`, uploads them to R2, updates each DB row in a transaction, validates public access with `HEAD`, and prints an `oldUrl` → `newUrl` mapping for rollback records.

Cleanup plan: keep Vercel Blob objects and `BLOB_READ_WRITE_TOKEN` through a retention period after migration, sample migrated storefronts/OG previews, keep rollback mapping, then remove legacy Blob credentials and delete old objects only after no DB rows reference `*.public.blob.vercel-storage.com`.

## Security

Tokolink includes several hardening patterns:

- **CSRF protection** through TanStack Start middleware.
- **Supabase token verification** in auth middleware before protected mutations.
- **Tenant ownership checks** before updating or deleting tenant-scoped products and links.
- **Zod validation** for incoming Server Function input.
- **Public/API abuse protection** with server-side rate limits for auth, onboarding, checkout, shipping, and webhook lookup paths.
- **Turnstile helper** ready for end-to-end client/server token wiring.
- **OTP brute-force protection** with server-side rate limits, hashed OTP storage, attempt limits, resend cooldown, and expiry handling.
- **Image upload validation** with filename extension checks, magic-byte checks, dimension guard, malware-scan hook, media metadata, and 5MB pre-decode limit.
- **R2 object uploads** with tenant-scoped keys, immutable public cache headers, and public custom-domain URLs.
- **OG image SSRF guard** with an allowlist for legacy Blob, R2 public domain, and production loopback/local-network blocking.
- **Secret hygiene** through `.env.example` templates, local `.env` usage, and CI secret scanning.
- **Observability hooks** through structured server logs, request IDs, health checks, basic metrics, and client analytics abstraction.

## Deployment

The app is configured for Vercel through Nitro's `vercel` preset.

Health check:

```bash
curl https://tokolink-v2.vercel.app/api/health
```

The endpoint checks DB reachability, required env presence, and R2 storage config without exposing secret values.

Use [preview deploy checklist](docs/preview-deploy-checklist.md) and [performance baseline](docs/performance-baseline.md) before promoting a preview.

Before deploying:

1. Set all required environment variables in Vercel.
2. Configure PostgreSQL/Supabase database connectivity.
3. Generate/push Prisma schema or apply migrations.
4. Configure Supabase Auth redirect URLs and providers.
5. Configure Cloudflare R2 public domain, RajaOngkir API key, Resend sender identity, and Turnstile domain allowlist.
6. Run `bun run build` locally or in CI.

## Documentation

- [Architecture](docs/architecture.md) — auth, storage, DB, Server Functions, checkout, payment, shipping, and ledger flow.
- [Security](docs/security.md) — CSRF posture, Turnstile, upload validation, OTP limits, webhook validation, and reconciliation.
- [Testing](docs/testing.md) — test layers, mocks, factories, coverage, and CI gate.
- [Troubleshooting](docs/troubleshooting.md) — Prisma, Supabase cookies, R2 public URL, Turnstile localhost, Pakasir webhook, RajaOngkir, and email issues.
- [Payout policy](docs/payout-policy.md) — platform fee, balance hold, minimum withdrawal, and manual payout processing.
- [Performance baseline](docs/performance-baseline.md) — bundle guardrails, route data-flow audit, production TTFB spot checks, and Lighthouse targets.
- [Preview deploy checklist](docs/preview-deploy-checklist.md) — checks before preview promotion.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, development rules, quality checks, and pull request expectations.

## License

Tokolink is released under the [MIT License](LICENSE). You may use, modify, and distribute it for private or commercial purposes under the license terms.
