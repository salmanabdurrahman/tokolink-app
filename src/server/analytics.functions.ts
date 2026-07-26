import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { enforceAuthRateLimit } from "./auth-abuse";
import { recordAnalyticsEventSchema } from "../lib/schemas";
import { requireTenant } from "./tenant-context.server";
import {
  ANALYTICS_FUNNEL_EVENTS,
  incrementAnalyticsEvent,
  startOfUtcDay,
} from "./analytics-events.server";

type ServerFnRequestContext = { request?: Request };

function withRequest<TContext>(context: TContext) {
  return context as TContext & ServerFnRequestContext;
}

// Public, rate-limited entrypoint for client-fired funnel events (storefront
// view, product click, checkout start, WhatsApp click). payment_completed is
// recorded directly from the trusted Pakasir webhook flow instead, so it
// can't be spoofed through this public endpoint.
export const recordAnalyticsEvent = createServerFn({ method: "POST" })
  .validator(recordAnalyticsEventSchema)
  .handler(async (ctx) => {
    const { data, request } = withRequest(ctx);
    await enforceAuthRateLimit({ event: "analytics_event", request });

    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
      select: { id: true },
    });
    if (!tenant) return { ok: false };

    await incrementAnalyticsEvent(tenant.id, data.event);
    return { ok: true };
  });

const getAnalyticsFunnelValidator = z
  .object({
    days: z.number().int().min(1).max(90),
  })
  .partial();

export const getAnalyticsFunnel = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(getAnalyticsFunnelValidator)
  .handler(async ({ data, context }) => {
    const tenantId = requireTenant(context);
    const days = data.days ?? 30;
    const since = startOfUtcDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));

    const rows = await prisma.analyticsDaily.groupBy({
      by: ["event"],
      where: { tenantId, date: { gte: since } },
      _sum: { count: true },
    });

    const totals = Object.fromEntries(
      ANALYTICS_FUNNEL_EVENTS.map((event) => [
        event,
        rows.find((row) => row.event === event)?._sum.count ?? 0,
      ]),
    ) as Record<(typeof ANALYTICS_FUNNEL_EVENTS)[number], number>;

    return { days, totals };
  });
