# Performance Baseline

Baseline dibuat dari production build lokal dan sampling read-only production supaya ukuran bundle, TTFB, dan aliran data halaman bisa dipantau sebelum deploy.

## Build baseline

Command:

```bash
bun run build
```

Current client chunks to watch after performance cleanup:

| Area                     | Baseline                         | Notes                                                      |
| ------------------------ | -------------------------------- | ---------------------------------------------------------- |
| Storefront route         | `/_slug-*` chunk ~17 kB minified | Catalog UI only; no DB/runtime server dependency in client |
| Landing route            | `/index-*` chunk ~19 kB minified | Marketing page                                             |
| Withdrawal server fn RPC | ~0.6 kB minified                 | Must stay small; should not pull Prisma/pg into client     |
| Shared motion            | `motion-*` chunk ~127 kB         | Watch if motion usage grows across dashboard/storefront    |
| Shared runtime           | `react-*` + router/vendor chunks | Watch gzip size in build output                            |

Guardrail:

```bash
bun run build
for f in .vercel/output/static/assets/*.js; do
  if grep -q "PrismaClient\|PrismaPg\|pgpass\|DATABASE_URL" "$f"; then echo "$f"; fi
done
```

Expected output: no files. If a client asset contains Prisma/pg/server-only code, split server-only helpers into `*.server.ts` or avoid importing server runtime from client-reachable modules.

## Data-flow audit checklist

Run this checklist before promoting a preview when dashboard or DB interactions feel slow:

1. **Auth/session** — avoid duplicate Supabase `getUser` + Prisma user/tenant reads on one navigation. Dashboard parent data should be loaded through one protected server function when possible.
2. **Dashboard parent loader** — keep shell data light: tenant identity + badge/counts only. Load products, links, and settings data in their own child route loaders so every dashboard page does not download the full catalog.
3. **Orders page** — list query should only include fields used by UI. Do not include `ledgerEntries` in order list unless rendered.
4. **Storefront** — public `/{slug}` currently loads full tenant catalog, links, products, variants, and options. For large stores, add pagination or split summary/catalog data before increasing product limits.
5. **Images** — catalog images should default to `loading="lazy"` and `decoding="async"`; use eager only for above-the-fold/avatar images.
6. **External APIs** — RajaOngkir and Pakasir calls sit on user interaction path. Keep timeout, loading state, and caching/debounce for destination search.
7. **DB indexes** — keep composite indexes for sorted variants, media cleanup, and ledger balance aggregates applied in production migrations.
8. **DB pooling** — production `DATABASE_URL` should be pooled when hosted on serverless/Vercel. Use direct DB URLs only for Prisma CLI/migrations.

## Production read-only spot checks

Use read-only timing checks; never print secrets/cookies.

```bash
for url in \
  https://tokolink-v2.vercel.app/ \
  https://tokolink-v2.vercel.app/auth \
  https://tokolink-v2.vercel.app/sitemap.xml \
  https://tokolink-v2.vercel.app/kopi-senja; do
  curl -L -s -o /dev/null -w "${url} status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n" "$url"
done
```

Recent audit sample before deploy fix showed public DB-backed pages around `1.2s–3.0s` TTFB, while static-ish auth/landing were around `0.38s–0.44s`. Re-check after deployment; DB-backed pages should trend down after caching/data-flow/pooling fixes.

## Lighthouse baseline

Run against a production build preview or Vercel preview URL:

```bash
bun run build
bun run preview
```

Then run Lighthouse for:

- `/`
- `/{store-slug}`
- `/dashboard`
- `/dashboard/orders`

Record mobile Performance, Accessibility, Best Practices, SEO, LCP, CLS, and INP before broad UI/performance work.
