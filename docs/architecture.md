# Architecture

Tokolink is a TanStack Start app with React routes, Server Functions, Prisma/PostgreSQL data, Supabase Auth, R2 media, Pakasir checkout, RajaOngkir shipping, and Resend email.

## Request and routing

- Public pages live in `src/routes` and use TanStack Router file routes.
- Route loaders fetch data required before render.
- Protected dashboard screens use `useAuthGuard({ requireTenant: true })`.
- Server Functions live in `src/server/*.functions.ts` and use Zod validators for incoming data.

## Auth

- Browser auth uses `src/lib/supabase.ts`.
- Server/admin auth uses `src/lib/supabase.server.ts`.
- `useSession()` syncs Supabase sessions into Prisma `User` rows via `syncSession`.
- Protected Server Functions use `authMiddleware`, which reads `sb-access-token`, verifies Supabase auth, loads Prisma user, and attaches tenant context.
- Signup, OTP resend, and onboarding use Cloudflare Turnstile.
- OTP codes are hashed before storage and protected by server-side rate limits/cooldowns.

## Data model

Core ownership:

- `User` owns optional `Tenant`.
- `Tenant` owns products, links, media, customers, orders, ledger entries, and withdrawal requests.
- Tenant-owned writes must be scoped by `tenantId` from auth context.

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

## Checkout, payment, shipping, ledger

1. Storefront cart sends checkout data to `createCheckoutOrder`.
2. Server validates cart, customer, tenant origin, destination, courier, service, and totals.
3. Order is created as `pending_payment` with item/shipping/fee snapshots.
4. Pakasir transaction is created and buyer receives payment URL.
5. Pakasir webhook is verified by checking provider transaction detail server-side.
6. Paid order creates ledger credit and platform fee entries.
7. Balance becomes available after H+2 according to payout policy.
8. Tenant fulfills from dashboard: add tracking number, mark shipped/completed, or cancel unpaid/manual orders.

## Observability

- Server logs are structured and redacted.
- Request IDs are attached for correlation.
- `/api/health` checks DB, env, and storage config without exposing secret values.
- Metric helpers track auth, upload, payment, shipping, and withdrawal events.
