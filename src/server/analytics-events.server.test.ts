import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: { analyticsDaily: { upsert: vi.fn() } },
}));

import { prisma } from "../db";
import { ANALYTICS_FUNNEL_EVENTS, incrementAnalyticsEvent } from "./analytics-events.server";

const prismaAny = prisma as any;

describe("ANALYTICS_FUNNEL_EVENTS", () => {
  it("matches the merchant funnel order", () => {
    expect(ANALYTICS_FUNNEL_EVENTS).toEqual([
      "storefront_view",
      "product_click",
      "checkout_started",
      "payment_completed",
      "whatsapp_click",
    ]);
  });
});

describe("incrementAnalyticsEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts one row per tenant/day/event, incrementing count", async () => {
    const date = new Date("2026-01-15T00:00:00.000Z");

    await incrementAnalyticsEvent("tenant-1", "product_click", date);

    expect(prismaAny.analyticsDaily.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_date_event: { tenantId: "tenant-1", date, event: "product_click" },
      },
      update: { count: { increment: 1 } },
      create: { tenantId: "tenant-1", date, event: "product_click", count: 1 },
    });
  });
});
