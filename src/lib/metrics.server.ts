import { logger } from "./logger.server";

export type MetricEvent =
  | "signup_success"
  | "signup_fail"
  | "otp_fail"
  | "upload_fail"
  | "tenant_create_fail"
  | "pakasir_webhook_fail"
  | "rajaongkir_fail"
  | "withdrawal_request"
  | "storefront_cache_hit"
  | "storefront_cache_miss"
  | "auth_verify_local"
  | "auth_verify_network";

export function recordMetric(event: MetricEvent, fields: Record<string, unknown> = {}) {
  logger.info("metric", { event, ...fields });
}

// Hot server functions/loaders this app cares about for latency tracking.
// Kept as a closed union so call sites can't silently drift the event name
// used for a given endpoint across edits.
export type TimingEvent =
  | "get_tenant"
  | "get_dashboard_data"
  | "get_my_tenant_products"
  | "get_my_tenant_links"
  | "checkout"
  | "auth_verify";

// Logs one structured `timing` line per call: { event, durationMs, ...fields }.
// There is no in-process metrics store (serverless: each invocation is a
// separate instance), so p50/p95 are computed downstream by querying the log
// aggregator for `message: "timing"` grouped by `event` — not aggregated here.
// See docs/observability.md.
export function recordTiming(
  event: TimingEvent,
  durationMs: number,
  fields: Record<string, unknown> = {},
) {
  logger.info("timing", { event, durationMs: Math.round(durationMs), ...fields });
}

// Wraps an async handler, logging its duration via `recordTiming` regardless
// of success/failure. `fields` may include a manually-counted `queryCount`
// (no Prisma middleware/query-count instrumentation in this stack) and other
// static per-call metadata known at the call site.
export async function withTiming<T>(
  event: TimingEvent,
  fields: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordTiming(event, performance.now() - start, fields);
  }
}
