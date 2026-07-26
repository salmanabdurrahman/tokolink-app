import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredAuthData } from "./data-retention.server";

function fakePrisma() {
  return {
    authRateLimit: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
    authAuditLog: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
    verificationCode: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    order: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    analyticsDaily: { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) },
  } as any;
}

describe("cleanupExpiredAuthData", () => {
  it("deletes expired rows from every retained table and returns counts", async () => {
    const prisma = fakePrisma();

    const result = await cleanupExpiredAuthData(prisma);

    expect(result).toEqual({
      authRateLimits: 3,
      authAuditLogs: 5,
      verificationCodes: 2,
      canceledOrders: 1,
      analyticsDailyRows: 4,
    });
  });

  it("only targets CANCELED orders past retention by canceledAt", async () => {
    const prisma = fakePrisma();

    await cleanupExpiredAuthData(prisma);

    expect(prisma.order.deleteMany).toHaveBeenCalledWith({
      where: {
        status: "CANCELED",
        canceledAt: { lt: expect.any(Date) },
      },
    });
  });

  it("targets rate limit buckets by windowStart and verification codes by expiresAt", async () => {
    const prisma = fakePrisma();

    await cleanupExpiredAuthData(prisma);

    expect(prisma.authRateLimit.deleteMany).toHaveBeenCalledWith({
      where: { windowStart: { lt: expect.any(Date) } },
    });
    expect(prisma.verificationCode.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
    expect(prisma.authAuditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
    expect(prisma.analyticsDaily.deleteMany).toHaveBeenCalledWith({
      where: { date: { lt: expect.any(Date) } },
    });
  });
});
