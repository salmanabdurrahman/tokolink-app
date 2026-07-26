import { prisma } from "../db";
import { analyticsFunnelLabels } from "../lib/status-labels";

export type AnalyticsFunnelEvent = keyof typeof analyticsFunnelLabels;

export const ANALYTICS_FUNNEL_EVENTS = Object.keys(analyticsFunnelLabels) as AnalyticsFunnelEvent[];

function startOfUtcDay(date: Date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Shared by trusted server call sites (public recordAnalyticsEvent fn,
// storefront loader, payment webhook). One row per tenant+day+event,
// incremented atomically so concurrent hits never race, mirroring the
// AuthRateLimit bucket upsert pattern. Plain server-only helper (not a
// createServerFn) so it must live in a `.server.ts` module: it's called
// directly from other trusted `.server.ts` code (order-helpers.server.ts)
// without an RPC round-trip.
export async function incrementAnalyticsEvent(
  tenantId: string,
  event: AnalyticsFunnelEvent,
  date: Date = startOfUtcDay(),
) {
  await prisma.analyticsDaily.upsert({
    where: { tenantId_date_event: { tenantId, date, event } },
    update: { count: { increment: 1 } },
    create: { tenantId, date, event, count: 1 },
  });
}

export { startOfUtcDay };
