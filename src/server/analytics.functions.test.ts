import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    analyticsDaily: { upsert: vi.fn(), groupBy: vi.fn() },
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));

const enforceAuthRateLimit = vi.hoisted(() => vi.fn());
vi.mock("./auth-abuse", () => ({ enforceAuthRateLimit }));

import { prisma } from "../db";
import { ANALYTICS_FUNNEL_EVENTS } from "./analytics-events.server";
import { getAnalyticsFunnel, recordAnalyticsEvent } from "./analytics.functions";

const prismaAny = prisma as any;
const recordAnalyticsEventHandler = recordAnalyticsEvent as any;
const getAnalyticsFunnelHandler = getAnalyticsFunnel as any;

describe("recordAnalyticsEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves tenantId from slug and increments the event", async () => {
    enforceAuthRateLimit.mockResolvedValue(undefined);
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ id: "tenant-1" });

    const result = await recordAnalyticsEventHandler({
      data: { tenantSlug: "kopi-nusantara", event: "product_click" },
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "kopi-nusantara" },
      select: { id: true },
    });
    expect(prismaAny.analyticsDaily.upsert).toHaveBeenCalledTimes(1);
  });

  it("returns ok: false for unknown tenant slug without throwing", async () => {
    enforceAuthRateLimit.mockResolvedValue(undefined);
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    const result = await recordAnalyticsEventHandler({
      data: { tenantSlug: "unknown-toko", event: "whatsapp_click" },
    });

    expect(result).toEqual({ ok: false });
    expect(prismaAny.analyticsDaily.upsert).not.toHaveBeenCalled();
  });

  it("propagates rate limit rejection instead of recording the event", async () => {
    enforceAuthRateLimit.mockRejectedValue(
      new Error("Terlalu banyak percobaan. Silakan coba lagi nanti."),
    );

    await expect(
      recordAnalyticsEventHandler({
        data: { tenantSlug: "kopi-nusantara", event: "checkout_started" },
      }),
    ).rejects.toThrow("Terlalu banyak percobaan");
    expect(prismaAny.analyticsDaily.upsert).not.toHaveBeenCalled();
  });
});

describe("getAnalyticsFunnel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws without tenant context", async () => {
    await expect(
      getAnalyticsFunnelHandler({ data: {}, context: { user: { id: "user-1" } } }),
    ).rejects.toThrow("Toko tidak ditemukan untuk pengguna ini");
  });

  it("fills every funnel event with 0 when there is no data yet", async () => {
    vi.mocked(prismaAny.analyticsDaily.groupBy).mockResolvedValue([]);

    const result = await getAnalyticsFunnelHandler({
      data: {},
      context: { tenant: { id: "tenant-1" } },
    });

    expect(result.days).toBe(30);
    for (const event of ANALYTICS_FUNNEL_EVENTS) {
      expect(result.totals[event]).toBe(0);
    }
  });

  it("aggregates grouped counts per event within the requested range", async () => {
    vi.mocked(prismaAny.analyticsDaily.groupBy).mockResolvedValue([
      { event: "storefront_view", _sum: { count: 120 } },
      { event: "product_click", _sum: { count: 40 } },
    ]);

    const result = await getAnalyticsFunnelHandler({
      data: { days: 7 },
      context: { tenant: { id: "tenant-1" } },
    });

    expect(prismaAny.analyticsDaily.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["event"],
        where: { tenantId: "tenant-1", date: { gte: expect.any(Date) } },
        _sum: { count: true },
      }),
    );
    expect(result.days).toBe(7);
    expect(result.totals.storefront_view).toBe(120);
    expect(result.totals.product_click).toBe(40);
    expect(result.totals.payment_completed).toBe(0);
  });
});
