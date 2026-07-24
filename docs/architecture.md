# Architecture

Tokolink is a TanStack Start app with React routes, Server Functions, Prisma/PostgreSQL data, Supabase Auth, R2 media, Pakasir checkout, RajaOngkir shipping, and Resend email.

## Request and routing

- Public pages live in `src/routes` and use TanStack Router file routes.
- Route loaders fetch data required before render.
- Protected dashboard screens use `useAuthGuard({ requireTenant: true })`.
- Server Functions live in `src/server/*.functions.ts` and use Zod validators for incoming data.
- Public API route files keep HTTP parsing/response shape thin; business logic lives in `src/server/*.server.ts` services/queries.

## Auth

- Browser auth uses `src/lib/supabase.ts`.
- Server/admin auth uses `src/lib/supabase.server.ts`.
- `useSession()` syncs Supabase sessions into Prisma `User` rows via `syncSession`.
- Protected Server Functions use `authMiddleware`, which reads `sb-access-token`, verifies Supabase auth, loads Prisma user, and attaches tenant context.
- Turnstile verifier/helpers are present; auth/onboarding/checkout currently depend on server-side rate limits until client token wiring is enabled end-to-end.
- OTP codes are hashed before storage and protected by server-side rate limits/cooldowns.

## Data model

Core ownership:

- `User` owns optional `Tenant`.
- `Tenant` owns products, links, media, customers, orders, ledger entries, and withdrawal requests.
- Tenant-owned writes must be scoped by `tenantId` from auth context.
- Shared tenant helpers live in `src/server/tenant-context.server.ts`: `requireTenant(context)` for protected tenant context and `requireOwnedRecord(...)` for product/link/order ownership checks.
- Catalog/read query shapes live in `src/server/catalog.queries.server.ts` so route loaders and server services share include/select/order rules.

Commerce flow:

- `Customer` stores buyer identity/contact/address per tenant.
- `Order` stores customer, shipping, subtotal, fee, total, and status snapshots.
- `OrderItem` stores product/variant/weight/price snapshots.
- `Payment` stores Pakasir transaction state and safe provider payload.
- `LedgerEntry` is source of truth for tenant balance.
- `WithdrawalRequest` stores payout requests and processing status.

## Storage

- New uploads go to Cloudflare R2 through `src/server/storage.ts`.
- Object keys are tenant-scoped under `tenants/{tenantId}/...`.
- Public URLs come from `R2_PUBLIC_BASE_URL`, not private S3 endpoints.
- Legacy Vercel Blob URLs remain readable during migration.
- Media metadata is stored in DB so replaced/deleted images can be cleaned up.

## Client state and UI helpers

- `src/lib/store.ts` is a compatibility barrel that exports split Zustand stores.
- Auth state lives in `src/lib/auth-store.ts`.
- Tenant mutation state lives in `src/lib/tenant-store.ts`; Server Functions are imported dynamically inside actions.
- Cart state lives in `src/lib/cart-store.ts` and persists per browser session/local storage.
- WhatsApp/cart message helpers live in `src/lib/commerce.ts`.
- `useLoadedTenant(loadedTenant)` hydrates route loader tenant data into dashboard store views.

## Checkout, payment, shipping, ledger

1. Storefront cart sends checkout data to `/api/checkout`.
2. Server validates cart, customer, tenant origin, destination, courier, service, and totals.
3. Server re-queries RajaOngkir and only accepts a shipping quote that matches destination, courier, service, cost, and calculated weight.
4. Order is created as `pending_payment` with item/shipping/fee snapshots.
5. Pakasir transaction is created and buyer receives payment URL.
6. Pakasir webhook is verified by checking provider transaction detail server-side.
7. Pending orders are conditionally marked paid and ledger credit/fee entries are duplicate-guarded.
8. Balance becomes available after H+2 according to payout policy.
9. Tenant fulfills from dashboard: add tracking number, mark shipped/completed, or cancel unpaid/manual orders.

## Layer flow

```text
Route / UI
  → Server Function or API route
  → Service/query module in src/server/*.server.ts
  → Prisma and provider clients
  → PostgreSQL, R2, Pakasir, RajaOngkir, Resend, Supabase
```

Examples:

- Storefront catalog: `src/routes/$slug.tsx` → `getStorefrontCatalogBySlug(...)` → Prisma tenant/products/links.
- Checkout: `src/routes/api.checkout.ts` → `createCheckout(...)` → checkout service helpers → Prisma + RajaOngkir + Pakasir.
- Dashboard product/link/order writes: route UI → authenticated Server Function → tenant helper/ownership guard → Prisma.
- Media upload: dashboard UI → `uploadImage` Server Function → upload validation → R2 storage adapter → Prisma media metadata.

## Policy, config, labels, formatters

- Commerce constants live in `src/lib/commerce-policy.ts` and are re-exported server-side from `src/server/commerce-policy.server.ts`.
- Public URL helpers live in `src/lib/site-url.ts` for client-safe uses and `src/lib/config.server.ts` for server-side email/payment redirects.
- Status label maps live in `src/lib/status-labels.ts`.
- Currency/date formatters live in `src/lib/formatters.ts`.

## Refactor checklist

1. Add or update tests before splitting behavior.
2. Split one concern at a time.
3. Keep route/API files thin; move business/data logic to service/query modules.
4. Preserve tenant ownership guards and provider verification.
5. Run targeted test for changed layer, then typecheck/lint/build when scope is broad.

## Observability

- Server logs are structured and redacted.
- Request IDs are attached for correlation.
- `/api/health` checks DB, env, and storage config without exposing secret values.
- Metric helpers track auth, upload, payment, shipping, and withdrawal events.
