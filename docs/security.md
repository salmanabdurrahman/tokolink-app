# Security

Security controls are layered across middleware, Server Functions, validation, provider verification, and CI checks.

## CSRF and request safety

- TanStack Start middleware provides request handling for server routes/functions.
- Mutations use Server Functions with explicit `POST` methods.
- Inputs are validated with Zod before business logic runs.
- Public routes only expose safe storefront/order status data.

## Auth and tenant isolation

- Browser sessions come from Supabase Auth.
- Protected writes use `authMiddleware`.
- Middleware verifies the Supabase access token, loads the Prisma user, and attaches tenant context.
- Mutations never trust client-sent tenant/user IDs for ownership.
- Tenant-owned records are read/updated/deleted with `tenantId` guards.

## Turnstile and OTP abuse protection

- Signup, resend OTP, and onboarding require Cloudflare Turnstile.
- Production rejects missing/failed Turnstile tokens.
- Development may bypass only when secret is missing and `NODE_ENV !== "production"`.
- OTP codes are hashed with `OTP_HASH_SECRET` before storage.
- Signup, resend, and verify flows use server-side rate limits and resend cooldown.
- Auth abuse logs store hashed email/IP signals, not raw secrets.

## Upload validation

- Uploads require authenticated tenant context.
- Server rejects oversized base64 payloads before decode.
- Images are validated by extension, MIME, magic bytes, and dimensions.
- Filenames are normalized before key generation.
- R2 object keys are tenant-scoped.
- Public object URLs use configured public base URL.
- Media metadata supports cleanup after replacement/delete.
- Malware scanning has a hook point for future implementation.

## Payment and webhook validation

- Pakasir API key stays server-only.
- Checkout totals are calculated server-side from DB product/variant data and shipping choice.
- Pakasir webhook payload is not trusted as final proof.
- Webhook handler verifies `order_id` and amount, then double-checks with Pakasir Transaction Detail API.
- Duplicate webhooks are handled idempotently.
- Payment provider payload is stored as safe JSON for audit/reconciliation.

## Shipping API safety

- RajaOngkir API key stays server-only.
- Storefront calls server functions for destination search, cost, and waybill checks.
- Tenant origin, buyer destination, courier, service, and weight are validated before checkout.
- Errors are mapped to user-safe Indonesian messages.

## Ledger and withdrawal safety

- Merchant balance is calculated from `LedgerEntry`, not a mutable balance column.
- Platform fee is snapshotted per order.
- Available balance excludes canceled/refunded/disputed orders.
- Paid order credits become available after H+2.
- Requested/processing withdrawals reduce available balance to prevent double withdrawal.
- Payout processing is manual for MVP.

## Production deployment headers

- Vercel uses reproducible Bun installs with `bun install --frozen-lockfile`.
- Global response headers enforce HSTS, `nosniff`, frame denial, strict referrer policy, and disabled browser permissions for camera, microphone, geolocation, and payment.
- API routes are marked `Cache-Control: no-store` to avoid caching auth, tenant, checkout, webhook, or health responses at the edge.
- Static Vite assets under `/assets/*` stay immutable cached for one year.
- CSP is intentionally not set in `vercel.json` until script/style hashes or nonces are audited for TanStack Start/Vite production output.

## Secrets and CI

- Real `.env` files must not be committed.
- Service-role keys, R2 secrets, Pakasir API keys, RajaOngkir keys, Resend keys, and OTP secrets are server-only.
- CI runs lint, typecheck, tests, build, coverage artifact upload, and basic secret scanning.
