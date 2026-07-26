import crypto from "crypto";
import { prisma } from "../db";

export type AuthAbuseEvent =
  | "signup"
  | "resend_signup_code"
  | "verify_signup_code"
  | "onboarding"
  | "checkout"
  | "shipping_destinations"
  | "shipping_costs"
  | "shipping_locations"
  | "payment_webhook_lookup"
  | "analytics_event";
export type AuthAbuseOutcome = "success" | "blocked" | "failed";

const RATE_LIMITS: Record<AuthAbuseEvent, { limit: number; windowMs: number }> = {
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  resend_signup_code: { limit: 3, windowMs: 10 * 60 * 1000 },
  verify_signup_code: { limit: 10, windowMs: 10 * 60 * 1000 },
  onboarding: { limit: 10, windowMs: 60 * 60 * 1000 },
  checkout: { limit: 20, windowMs: 10 * 60 * 1000 },
  shipping_destinations: { limit: 60, windowMs: 10 * 60 * 1000 },
  shipping_costs: { limit: 40, windowMs: 10 * 60 * 1000 },
  // Cascading provinsi/kota/kecamatan/kelurahan picker can fire several
  // lookups per checkout/settings session (one per dropdown level, plus
  // re-selections), so this needs a higher ceiling than the free-text search.
  shipping_locations: { limit: 120, windowMs: 10 * 60 * 1000 },
  payment_webhook_lookup: { limit: 120, windowMs: 10 * 60 * 1000 },
  // Storefront view/product click/checkout start/WhatsApp click can all fire
  // several times per real browsing session; ceiling only needs to catch
  // scripted abuse, not normal shopping behavior.
  analytics_event: { limit: 120, windowMs: 10 * 60 * 1000 },
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
  // Fixed window bucket (not sliding): aligns every request in the same
  // windowMs slice to one row, so the atomic upsert below both closes the
  // count-then-create race and keeps one row per active scope per window
  // instead of one row per request.
  const windowStart = new Date(Math.floor(Date.now() / config.windowMs) * config.windowMs);

  const bucket = await prisma.authRateLimit.upsert({
    where: { event_scopeKey_windowStart: { event, scopeKey, windowStart } },
    update: { count: { increment: 1 } },
    create: { event, scopeKey, windowStart, count: 1, emailHash, ipHash, userHash },
  });

  if (bucket.count > config.limit) {
    await logAuthAbuse({ event, email, userId, request, outcome: "blocked" });
    throw new Error("Terlalu banyak percobaan. Silakan coba lagi nanti.");
  }
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
  await prisma.authAuditLog.create({
    data: {
      event,
      emailHash: hashIdentifier(email),
      ipHash: hashIdentifier(getClientIp(request)),
      userHash: hashIdentifier(userId),
      outcome,
    },
  });
}
