# Observability

Lightweight, code-only observability: structured JSON logs, no external APM/metrics store. Every server invocation is a separate serverless instance, so aggregation (p50/p95, cache hit rate) happens downstream against collected logs, not in-process.

## Log shape

All logs go through `src/lib/logger.server.ts` (`logger.info/warn/error`) as single-line JSON:

```json
{ "level": "info", "message": "timing", "time": "...", "event": "get_dashboard_data", "durationMs": 42, "queryCount": 4 }
{ "level": "info", "message": "metric", "time": "...", "event": "storefront_cache_hit", "slug": "kopi-senja" }
```

Sensitive-looking keys (`token`, `secret`, `password`, `otp`, etc.) are redacted automatically by `logger.server.ts`; long string values are truncated. Safe to ship these logs to any log destination (Vercel logs, Logtail, Datadog, etc.) without extra scrubbing.

## Timing (`message: "timing"`)

`src/lib/metrics.server.ts` exports:

- `recordTiming(event, durationMs, fields?)` — logs one `timing` line.
- `withTiming(event, fields, fn)` — wraps an async handler, always logs duration (success or throw) via `finally`.

`event` is a closed union (`TimingEvent`) so call sites can't drift the event name for a given endpoint. Instrumented hot paths:

| Event                    | Where                                                       | Fields                                            |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------- |
| `get_tenant`             | `src/server/tenant.functions.ts` (public storefront)        | `slug`                                            |
| `get_dashboard_data`     | `src/server/tenant.functions.ts` (dashboard shell)          | `queryCount` (static, 4)                          |
| `get_my_tenant_products` | `src/server/tenant.functions.ts`                            | `queryCount` (static, 1)                          |
| `get_my_tenant_links`    | `src/server/tenant.functions.ts`                            | `queryCount` (static, 1)                          |
| `checkout`               | `src/server/checkout.server.ts` (`createCheckoutOrderData`) | `queryCount` (static, ~3, includes 1 transaction) |
| `auth_verify`            | `src/server/auth-middleware.ts` (`resolveSupabaseUserId`)   | none                                              |

`queryCount` is a **manual, static count** written at the call site (this stack has no Prisma query-count middleware/`$extends` instrumentation) — it reflects the known number of DB round-trips in that handler as of when the comment was written, not a live counter. Update the number if the handler's query shape changes.

### Computing p50/p95

There is no in-process percentile aggregation. To get p50/p95 for an event:

1. Query the log destination for `message: "timing" AND event: "<name>"` over the desired time window.
2. Extract `durationMs`.
3. Compute the 50th/95th percentile over that set (log tool's built-in percentile aggregation, or export + compute manually).

Example with `jq` against exported log JSONL:

```bash
jq -r 'select(.message=="timing" and .event=="get_dashboard_data") | .durationMs' logs.jsonl \
  | sort -n | awk '{a[NR]=$1} END{print "p50="a[int(NR*0.50)], "p95="a[int(NR*0.95)]}'
```

## Metrics (`message: "metric"`)

`recordMetric(event, fields?)` logs a one-off business/cache event. Relevant to latency work:

- `storefront_cache_hit` / `storefront_cache_miss` — `getStorefrontCatalogBySlug` in-memory catalog cache (`src/server/catalog.queries.server.ts`), 60s TTL per runtime instance. Low hit rate under real traffic means the per-instance cache isn't warm enough (short-lived serverless instances, or traffic spread across many instances) — see `docs/performance-baseline.md` cross-instance cache note in Phase 34.
- `auth_verify_local` / `auth_verify_network` — which path `resolveSupabaseUserId` took. `local` verifies the JWT against cached JWKS with no network call; `network` falls back to `supabaseAdmin.auth.getUser` (GoTrue network round-trip), which is disabled in production. A `network` event in production logs would indicate a config problem (see `docs/security.md`).

Full list of metric/timing event names lives in `src/lib/metrics.server.ts` (`MetricEvent`, `TimingEvent`).

## Baseline methodology (Phase 30–33 auth/session/loader work)

There is no recorded production baseline for these events yet (instrumentation added after the Phase 30–33 fixes shipped). To establish before/after numbers for a future change in this area:

1. Deploy the instrumented build to production (or a representative preview with real traffic).
2. Let it run long enough to collect a meaningful sample per event (hundreds of requests minimum; hot dashboard/storefront/checkout paths should reach this within a day of normal traffic).
3. Pull `durationMs` p50/p95 per event using the query above, and `storefront_cache_hit`/`miss` counts to get a hit rate.
4. Record the numbers (with date + commit) in this file or `docs/performance-baseline.md` before making the next latency-sensitive change.
5. After the change ships and has collected a comparable sample window, repeat step 3 and diff against the recorded baseline.

This keeps "prove it, don't guess" (Phase 35 goal) actionable without requiring a metrics backend: the log lines are the source of truth, and percentiles/hit-rates are computed on demand from them.
