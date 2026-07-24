import crypto from "crypto";
import { prisma } from "../db";

export type AuthAbuseEvent = "signup" | "resend_signup_code" | "verify_signup_code" | "onboarding";
export type AuthAbuseOutcome = "success" | "blocked" | "failed";

const RATE_LIMITS: Record<AuthAbuseEvent, { limit: number; windowMs: number }> = {
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  resend_signup_code: { limit: 3, windowMs: 10 * 60 * 1000 },
  verify_signup_code: { limit: 10, windowMs: 10 * 60 * 1000 },
  onboarding: { limit: 10, windowMs: 60 * 60 * 1000 },
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function getOtpHashSecret() {
  const secret = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("OTP_HASH_SECRET wajib diisi di production.");
  }
  return secret || "development-otp-secret";
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashOtp(code: string) {
  return crypto.createHmac("sha256", getOtpHashSecret()).update(code).digest("hex");
}

export function hashIdentifier(value: string | null | undefined) {
  return value ? sha256(value) : "";
}

export function getClientIp(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request?.headers.get("x-real-ip") || "unknown";
}

export async function enforceAuthRateLimit({
  event,
  email,
  userId,
  request,
}: {
  event: AuthAbuseEvent;
  email?: string;
  userId?: string;
  request?: Request;
}) {
  const config = RATE_LIMITS[event];
  const ipHash = hashIdentifier(getClientIp(request));
  const emailHash = hashIdentifier(email);
  const userHash = hashIdentifier(userId);
  const scopeKey = emailHash || userHash || ipHash;
  const windowStart = new Date(Date.now() - config.windowMs);
  const prismaAny = prisma as any;

  const current = await prismaAny.authRateLimit.count({
    where: { event, scopeKey, createdAt: { gte: windowStart } },
  });

  if (current >= config.limit) {
    await logAuthAbuse({ event, email, userId, request, outcome: "blocked" });
    throw new Error("Terlalu banyak percobaan. Silakan coba lagi nanti.");
  }

  await prismaAny.authRateLimit.create({
    data: { event, scopeKey, emailHash, ipHash, userHash },
  });
}

export async function logAuthAbuse({
  event,
  email,
  userId,
  request,
  outcome,
}: {
  event: AuthAbuseEvent;
  email?: string;
  userId?: string;
  request?: Request;
  outcome: AuthAbuseOutcome;
}) {
  await (prisma as any).authAuditLog.create({
    data: {
      event,
      emailHash: hashIdentifier(email),
      ipHash: hashIdentifier(getClientIp(request)),
      userHash: hashIdentifier(userId),
      outcome,
    },
  });
}
