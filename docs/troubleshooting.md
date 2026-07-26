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
