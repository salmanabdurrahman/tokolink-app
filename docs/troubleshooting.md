# Troubleshooting

## Prisma

### `DIRECT_URL` missing

Prisma CLI commands use `DIRECT_URL` through `prisma.config.ts`. Add a direct PostgreSQL URL to `.env`:

```env
DIRECT_URL="postgresql://user:pass@host:5432/db"
```

Runtime app uses `DATABASE_URL`. Keep pooled connection URLs there when provider requires pooling.

### Schema changed but client stale

Run:

```bash
bun run db:generate
```

For local DB sync:

```bash
bun run db:push
```

Use migrations for durable schema changes:

```bash
bun run db:migrate
```

## Checkout and shipping API routes

### Toast shows raw Zod issue JSON instead of a readable message

Symptom: an error toast shows something like `[{ "validation": "regex", "code": "invalid_string", ... }]` instead of an Indonesian sentence. Seen on checkout (invalid customer data) and on the RajaOngkir location picker's quick search (search text under 3 characters).

Cause: an `src/routes/api.*.ts` route's `catch` block returned `error.message` straight from a thrown `ZodError` without formatting it. `ZodError` is `instanceof Error`, so it silently passes through generic `error instanceof Error ? error.message : ...` catch blocks. All routes that call `someSchema.parse(data)` inside the handler (`api.checkout.ts`, `api.shipping.costs.ts`, `api.shipping.destinations.ts`, `api.shipping.cities.ts`, `api.shipping.districts.ts`, `api.shipping.subdistricts.ts`) share this pattern, so a new route added the same way will reintroduce the bug.

Fix pattern (apply to any new `api.*.ts` route with a `.parse(data)` call):

- Validate obvious cases on the client first (e.g. `checkoutCustomerSchema.safeParse(...)` in `src/hooks/use-checkout-flow.ts`, or the `searchQuery.trim().length < 3` guard in `src/components/shipping/rajaongkir-location-picker.tsx`) and surface a readable error/per-field error, so the server almost never sees invalid data from normal usage.
- On the server, special-case `ZodError` in the catch block and use `error.issues[0]?.message` (a human-readable string) instead of `error.message` (raw JSON array) as the fallback.

The same failure shape also happens with `createServerFn().validator(zodSchema)` (dashboard forms, not just `api.*.ts` fetch routes): TanStack Start's `execValidator` does `throw new Error(JSON.stringify(result.issues, null, 2))` when the standard-schema validator reports issues (see `node_modules/@tanstack/start-client-core/dist/esm/createServerFn.js`). Any client call site that renders `error.message`/`err.message` straight into a toast without a client-side guard first will leak the same raw JSON if the user can submit input the schema rejects (e.g. a too-short resi number). Use the shared `getErrorMessage()` helper (`src/lib/utils.ts`, already used in `src/routes/onboarding.tsx` and `src/hooks/use-auth-form.ts`) instead of raw `error.message` in these catch blocks — it already unwraps this exact JSON-array shape into a `path - message` sentence.

Swept and fixed across the dashboard: `src/routes/dashboard.orders.tsx` (`submitTracking`, plus a client-side min-length guard — its resi/courier inputs had no length check before hitting the server), `src/routes/dashboard.links.tsx` (`persistLink`'s inline label/url edit had no guard either — clearing the label field and blurring hit the server unvalidated), `src/routes/dashboard.products.tsx`, `src/routes/dashboard.withdrawals.tsx` (defense-in-depth; the submit button is already disabled below the minimum amount), and `src/components/dashboard/category-manager.tsx` / `src/components/dashboard/product-form.tsx` (AI copy generation can exceed the server's name/keyword length caps).

Note: `src/components/dashboard/category-manager.tsx`'s `handleAdd` and inline category rename (`onRename`) call the store action without any `try`/`catch` at all, so a server-side failure there fails _silently_ (no toast, unhandled promise rejection) instead of leaking raw JSON. That is a separate bug (missing feedback, not raw-JSON exposure) and was left as-is — flag it if you want it fixed too.

## Supabase cookies/session

### Dashboard redirects to auth after login

Check:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` match browser project.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` match server project.
- Browser has `sb-access-token` cookie after login.
- `syncSession` can create/update Prisma `User` row.

### Protected Server Function says unauthorized

Check token expiry and cookie presence. Local browser sessions may need logout/login after env changes.

## R2 public URL

### Upload succeeds but image does not load

Check:

- `R2_PUBLIC_BASE_URL` points to public R2 custom domain.
- Bucket/domain allows public reads.
- Stored URL uses public base URL, not S3 endpoint.
- Object key exists under `tenants/{tenantId}/...`.

### OG image rejects uploaded media

Check `R2_PUBLIC_BASE_URL` host. OG helper allowlist depends on trusted R2 public domain and legacy Blob hosts.

## Turnstile localhost

### Token rejected locally

Check:

- `VITE_TURNSTILE_SITE_KEY` matches Turnstile widget config.
- `TURNSTILE_SECRET_KEY` exists when you want real verification.
- `TURNSTILE_ALLOWED_HOSTNAMES` includes `localhost` if hostname allowlist is enabled.
- In development, bypass only works when secret is missing and `NODE_ENV !== "production"`.

### Widget not rendering

Check browser console, site key, and whether script loading is blocked by extension/CSP.

## Pakasir webhook

### Order stays `pending_payment`

Check:

- `PAKASIR_PROJECT_SLUG`, `PAKASIR_API_KEY`, and `PAKASIR_BASE_URL` are set server-side.
- Pakasir webhook points to `/api/pakasir/webhook` on current `SITE_URL`.
- Webhook `order_id` matches Tokolink order number.
- Provider transaction detail API returns completed/paid status.
- Amount equals Tokolink order total.

### Duplicate webhook received

Expected. Handler is idempotent and should not duplicate ledger entries.

## RajaOngkir API key

### Location picker (provinsi/kabupaten-kota/kecamatan/kelurahan) is empty or stuck loading

The cascading picker calls `GET /api/shipping/provinces`, `/cities`, `/districts`, `/subdistricts` in
sequence (each scoped by the previous level's id). Confirm `RAJAONGKIR_API_KEY` and `RAJAONGKIR_BASE_URL`,
and check the `shipping_locations` rate limit bucket in `src/server/auth-abuse.ts` if requests are being
blocked. A district with no registered kelurahan/desa is expected to auto-finalize at the district level
instead of waiting for a 4th selection.

### Destination search ("Cari cepat") returns no result

Check spelling and location level. Try broader keywords first, or switch to the step-by-step
provinsi -> kabupaten/kota -> kecamatan -> kelurahan picker instead. Confirm `RAJAONGKIR_API_KEY` and
`RAJAONGKIR_BASE_URL`.

### Shipping cost unavailable

Check:

- Tenant origin ID (district or subdistrict level) is saved in dashboard settings.
- Buyer destination ID is selected via the cascading picker or quick search.
- Product weights are set and total weight is valid.
- Courier is enabled for tenant and supported by RajaOngkir route.

## Email

### OTP or receipt email not sent

Check `RESEND_API_KEY` and `RESEND_SENDER_EMAIL`. Sender identity must be verified in Resend.
