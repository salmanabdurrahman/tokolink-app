# AGENTS.md

Project instructions for AI/coding agents working in this repository.

## Project Overview

Tokolink is an open-source, multi-tenant link-in-bio storefront for Indonesian UMKM/MSME merchants. Each merchant gets one public store page with profile links, product catalog (categories, variants, optional stock, physical/digital type), client-side cart, WhatsApp order generation, and an online Pakasir checkout with RajaOngkir shipping, orders, ledger balance, and manual withdrawals.

Core flow:

1. User authenticates with Supabase Auth.
2. Session sync creates/updates Prisma `User` record.
3. User creates a `Tenant` store during onboarding.
4. Dashboard manages tenant settings, links, products, categories, images, variants, orders, analytics, and withdrawals.
5. Public `/$slug` storefront renders tenant data, reconciles the cart against the live catalog, and builds WhatsApp order URLs.
6. Online checkout (`/api/checkout`) validates cart/shipping, creates a `pending_payment` order plus Pakasir transaction; the verified Pakasir webhook marks it paid and writes ledger entries.
7. Paid orders credit tenant balance via `LedgerEntry`; merchants request payouts through `WithdrawalRequest`.
8. Storefront funnel events feed `AnalyticsDaily`; optional OpenAI-compatible AI assist drafts product copy and sales insight.

## Non-Negotiable: Follow Existing Patterns

Every change MUST follow existing project patterns. This is mandatory.

Do not introduce new architecture, data flow, UI style, naming style, validation style, state pattern, or server pattern unless explicitly requested and justified by repo evidence.

Before adding or changing logic, inspect analogous files first. Before changing UI, inspect existing UI on the same surface first. Pattern compliance applies to all levels:

- business logic
- auth/session logic
- data access and Prisma queries
- Server Functions and middleware
- Zod validation and error messages
- Zustand store actions
- tests and mocks
- routes, loaders, and metadata
- components and composition
- Tailwind classes, spacing, colors, typography, radius, borders
- loading/empty/error states
- motion/animation behavior
- copy tone and Indonesian user-facing language

If existing pattern conflicts with desired change, stop and explain trade-off before editing.

## Tech Stack

- React 19
- TanStack Start + TanStack Router
- TanStack Start Server Functions
- TypeScript strict mode
- Zustand for client state
- Tailwind CSS v4 with CSS variable design tokens
- Framer Motion for small UI transitions
- Prisma ORM with PostgreSQL
- Supabase Auth
- Cloudflare R2 for media uploads via S3-compatible adapter (legacy Vercel Blob dual-read during migration)
- Pakasir for online payment/checkout transactions and verified webhook
- RajaOngkir (Komerce) for domestic destination search and shipping cost
- Resend for email
- OpenAI-compatible provider for optional AI product copy and sales insight
- Cloudflare Turnstile helper/verifier (not enforced end-to-end until client token wiring is active); public/abuse paths guarded by server-side rate limits
- Vercel Analytics + code-only observability (structured logs, request IDs, `/api/health`, metric helpers)
- Vitest + Testing Library + jsdom

## Directory Map

```text
src/routes/               TanStack Router file routes, API routes (checkout, shipping, pakasir webhook, health, og, sitemap)
src/server/               Server Functions (*.functions.ts), service/query modules (*.server.ts), auth middleware, provider clients
src/lib/                  schemas, split Zustand stores, commerce/policy helpers, formatters, status labels, Supabase clients, OG helpers, types
src/components/ui/        local reusable UI primitives
src/components/layout/    shared navigation/layout components
src/components/brand/     brand/logo components
src/components/landing/   marketing page sections
src/components/dashboard/ dashboard-specific UI
src/components/storefront/ public storefront UI
src/components/shipping/  shipping/location picker UI
src/components/motion/    reusable animation helpers
src/hooks/                auth/session/mobile hooks
src/test/                 test setup and factories
scripts/                  db reset/seed, media migration, pool load test, auth-data cleanup
prisma/schema.prisma      DB schema, enums, and relations
```

Server layer convention: API route/Server Function files stay thin (HTTP parse, validate, respond); business/data logic lives in `*.server.ts` service/query modules. Shared read shapes live in `src/server/catalog.queries.server.ts`; tenant guards live in `src/server/tenant-context.server.ts`.

## Data Model Pattern

Domain models (`prisma/schema.prisma`):

- `User` owns one optional `Tenant`.
- `Tenant` owns `Product`, `ProductCategory`, `Link`, `Media`, `Customer`, `Order`, `LedgerEntry`, `WithdrawalRequest`, and `AnalyticsDaily` records.
- `Product` owns ordered `ProductVariantGroup` → ordered `ProductVariantOption` records; optionally belongs to one `ProductCategory` (`categoryId` nullable, `SetNull` on delete).
- `Product` flags: `trackStock`/`stock` (opt-in per product; `stock` null = untracked/always available), `weightGram` (shipping weight, default `1`), `isDigital` (no weight, skips shipping at checkout).
- Commerce: `Order` → many `OrderItem` (product/variant/weight/price snapshots), one `Payment` (Pakasir state), and `LedgerEntry` credits/fees. `Customer` stores buyer identity per tenant.
- `LedgerEntry` is the source of truth for tenant balance (no mutable balance field). `WithdrawalRequest` tracks payouts.
- Auth infra models: `VerificationCode` (hashed OTP), `AuthRateLimit`, `AuthAuditLog`.
- Enums: `OrderStatus`, `PaymentProvider`, `PaymentStatus`, `LedgerEntryType`, `LedgerEntryStatus`, `WithdrawalStatus`.
- `sortOrder` controls display order for links, products, categories, groups, and options.
- Prisma models use camelCase in TypeScript and snake_case DB names via `@map` / `@@map`.
- Tenant-owned data must always be scoped by `tenantId` for mutations.

## Routing Pattern

Follow existing route files in `src/routes`.

- Use `createFileRoute(...)`.
- Keep page-level component in same route file unless component is reused or large.
- Use route `loader` for data needed before render.
- Use route `head` for title, description, Open Graph, Twitter card, canonical links.
- Use `notFound()` for missing public storefront data.
- Do not manually edit `src/routeTree.gen.ts`; it is generated.

## Server Function Pattern

Follow `src/server/*.functions.ts`.

Required pattern:

```ts
export const actionName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(schema)
  .handler(async ({ data, context }) => {
    // validate tenant context
    // verify ownership when mutating tenant-scoped rows
    // execute Prisma query/transaction
    // return typed data
  });
```

Rules:

- Use `GET` for read functions, `POST` for mutations.
- Validate all input with Zod.
- Put shared schemas in `src/lib/schemas.ts`.
- Protected writes must include `authMiddleware`.
- Never trust client-sent tenant/user IDs for ownership.
- Use `requireTenant(context)` from `src/server/tenant-context.server.ts` for protected tenant context, and `requireOwnedRecord(...)` for product/link/order/category ownership checks (instead of ad-hoc `findFirst`).
- Use `context.tenant?.id` from middleware; check ownership with `findFirst({ where: { id, tenantId } })` when a helper does not already cover it.
- Keep `*.functions.ts` and API route files thin; move business/data logic into `*.server.ts` service/query modules and reuse read shapes from `catalog.queries.server.ts`.
- Use Prisma transactions for multi-step relational replacement (variants) and for ledger/stock transitions (`markOrderPaid` decrements stock and writes ledger entries with duplicate guards).
- Verify external provider state server-side (Pakasir webhook, RajaOngkir quotes); never trust client-sent payment/shipping totals.
- Throw explicit user-facing errors matching existing Indonesian style; never leak raw Zod error JSON to clients.
- Public/unauthenticated paths (checkout, shipping, analytics events, auth) must apply server-side rate limits.

## Auth/Session Pattern

Follow current Supabase + Prisma split.

- Browser auth uses `src/lib/supabase.ts`.
- Server/admin auth uses `src/lib/supabase.server.ts`.
- `useSession()` syncs Supabase session to Prisma via `syncSession`.
- Session cookie name is `sb-access-token`.
- `authMiddleware` verifies Supabase token, loads Prisma user, includes tenant in context.
- Dashboard protection uses `useAuthGuard({ requireTenant: true })`.
- Do not bypass `authMiddleware` for protected dashboard mutations.

## State Pattern

Follow the split Zustand stores. `src/lib/store.ts` is a compatibility barrel re-exporting them.

- Auth state: `src/lib/auth-store.ts`. Tenant mutation state: `src/lib/tenant-store.ts`. Cart state: `src/lib/cart-store.ts` (persisted per browser).
- Store actions call Server Functions (imported dynamically inside tenant actions) and update state immutably.
- Keep cart client-side; on storefront load reconcile it against the live catalog (drop missing products/variants, refresh `unitPrice`).
- Keep WhatsApp/cart message helpers in `src/lib/commerce.ts`; keep commerce constants in `src/lib/commerce-policy.ts`.
- Avoid duplicating tenant mutation state in routes unless route-only UI state.

## UI Pattern

UI must match existing Tokolink design. Pixel-level consistency matters.

Use existing primitives first:

- `Button`
- `Input`
- `Textarea`
- `Field`
- `Badge`
- `Modal`
- `Sheet`
- `Spinner`
- `ImageUpload`

Styling rules:

- Use Tailwind CSS v4 classes and tokens from `src/styles.css`.
- Use semantic colors: `background`, `foreground`, `surface`, `card`, `muted`, `muted-foreground`, `border`, `accent`, `destructive`.
- Avoid hardcoded random colors when a token exists.
- Use `font-display` for headings and default sans for body.
- Preserve warm off-white background, black ink, lime accent, subtle border, rounded-card style.
- Keep mobile-first layouts.
- Use existing spacing/radius patterns: rounded-xl/2xl/full, `px-4/6`, `p-6`, `gap-3/4/6`, `space-y-*`.
- Use `cn()` from `src/lib/utils.ts` for conditional class composition.
- Use Lucide icons if icon needed.
- Use Framer Motion only for purposeful micro-interactions matching existing dashboard/storefront motion.
- Provide loading, empty, disabled, hover, focus, and error states when relevant.
- Preserve Indonesian product-facing and merchant-facing copy unless explicitly asked otherwise.

Bad:

- adding a new button style instead of `Button`
- using raw blue/gray/red palettes outside token system
- desktop-only layout for storefront/dashboard
- inconsistent border radius or typography
- new modal/sheet implementation when existing primitive/pattern fits

## Form Pattern

- Local form state uses React `useState` in current dashboard forms.
- Use UI primitives for fields.
- Use `ImageUpload` for image URL/upload behavior.
- Convert numeric values explicitly before submit.
- Keep validation mirrored server-side with Zod; client checks are UX only.
- Use Sonner `toast` for success/failure feedback where existing pages do.

## Commerce, Checkout & Shipping Pattern

- Checkout enters through `src/routes/api.checkout.ts` → `createCheckout` service; keep the route thin.
- Server re-validates cart items, prices, tenant origin, destination, courier/service, weight, and totals. Never trust client-sent shipping cost or totals.
- Gate shipping with `cartRequiresShipping(tenant)`: a digital-only cart skips origin/destination/courier/address and settles `shippingCost = 0`; mixed carts still require shipping for physical items.
- Re-query RajaOngkir and only accept a quote matching destination, courier, service, cost, and calculated weight. Shipping API routes live in `src/routes/api.shipping.*`.
- Orders start `pending_payment` with item/shipping/fee snapshots. Pakasir webhook (`src/routes/api.pakasir.webhook.ts`) is verified server-side before `markOrderPaid`, which decrements stock (clamped at 0) and writes duplicate-guarded ledger entries.
- Balance comes from `LedgerEntry` only and becomes available per `docs/payout-policy.md`; withdrawals go through `withdrawal.functions.ts` / `withdrawal-admin.server.ts`.

## AI & Analytics Pattern

- AI is optional and isolated in `src/server/ai.functions.ts` (auth + rate limit) → `src/server/ai.server.ts` (OpenAI-compatible call, Zod-validated JSON). Send minimal data: product copy = name/keyword/category; sales insight = aggregated numbers only, no customer PII. AI failure must fall back gracefully, never block the underlying read/mutation.
- Funnel analytics: storefront UI → rate-limited public `recordAnalyticsEvent` → `incrementAnalyticsEvent` → `AnalyticsDaily` upsert. `payment_completed` is written only from the trusted Pakasir webhook flow. Dashboard reads via `analytics.functions.ts`.

## Testing Pattern

- Vitest tests live as `*.test.ts` / `*.test.tsx` near source.
- Shared factories live in `src/test/factories.ts`.
- Global setup lives in `src/test/setup.ts`.
- Mock Prisma and external services in server-function tests.
- Test ownership guards, validation failures, transaction behavior, image validation, URL safety, and store/cart helpers.
- When changing behavior, add/update targeted tests.

Preferred checks:

```bash
bun run typecheck
bun run lint
bun run test
```

Use coverage for broad server/data/state changes:

```bash
bun run test:coverage
```

## Security Rules

- Never hardcode secrets.
- Never commit `.env` with real values.
- Keep service-role keys server-only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `R2_SECRET_ACCESS_KEY`, `PAKASIR_API_KEY`, `RAJAONGKIR_API_KEY`, `RESEND_API_KEY`, `OTP_HASH_SECRET`, or Turnstile secret to browser code.
- Keep upload validation: magic bytes, size limit, safe blob path.
- Keep OG image SSRF guard and host allowlist.
- Keep OTP expiry and attempt limits.
- Keep server-side rate limits on public/abuse paths (auth, onboarding, checkout, shipping, analytics events, webhook lookup).
- Verify Pakasir webhook/payment state server-side before marking orders paid; keep ledger/stock transitions duplicate-guarded.
- Never leak raw Zod/validation error JSON to clients.
- Keep tenant ownership checks on all update/delete operations.

## Change Discipline

- Small scoped diffs only.
- No unrelated refactors.
- No broad formatting churn.
- No dependency upgrades unless explicitly requested.
- No public contract changes without updating callers/tests/docs.
- Inspect current implementation before editing.
- Verify with narrowest useful command.
- Summarize changed files and checks run.
