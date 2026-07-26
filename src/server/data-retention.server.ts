import { prisma } from "../db";
import {
  AUTH_AUDIT_LOG_RETENTION_DAYS,
  AUTH_RATE_LIMIT_RETENTION_DAYS,
  CANCELED_ORDER_RETENTION_DAYS,
  VERIFICATION_CODE_GRACE_DAYS,
} from "./commerce-policy.server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CleanupResult = {
  authRateLimits: number;
  authAuditLogs: number;
  verificationCodes: number;
  canceledOrders: number;
};

// Cron/manual retention sweep so AuthRateLimit, AuthAuditLog, VerificationCode,
// and old CANCELED orders don't grow unbounded and slow down the `count()`/
// lookup queries that run on every public request. Run via
// `bun scripts/cleanup-auth-data.ts`.
export async function cleanupExpiredAuthData(
  prismaClient: typeof prisma = prisma,
): Promise<CleanupResult> {
  const now = Date.now();
  const prismaAny = prismaClient as any;

  const [authRateLimits, authAuditLogs, verificationCodes, canceledOrders] = await Promise.all([
    prismaAny.authRateLimit.deleteMany({
      where: { windowStart: { lt: new Date(now - AUTH_RATE_LIMIT_RETENTION_DAYS * DAY_MS) } },
    }),
    prismaAny.authAuditLog.deleteMany({
      where: { createdAt: { lt: new Date(now - AUTH_AUDIT_LOG_RETENTION_DAYS * DAY_MS) } },
    }),
    prismaAny.verificationCode.deleteMany({
      where: { expiresAt: { lt: new Date(now - VERIFICATION_CODE_GRACE_DAYS * DAY_MS) } },
    }),
    prismaAny.order.deleteMany({
      where: {
        status: "CANCELED",
        canceledAt: { lt: new Date(now - CANCELED_ORDER_RETENTION_DAYS * DAY_MS) },
      },
    }),
  ]);

  return {
    authRateLimits: authRateLimits.count,
    authAuditLogs: authAuditLogs.count,
    verificationCodes: verificationCodes.count,
    canceledOrders: canceledOrders.count,
  };
}
