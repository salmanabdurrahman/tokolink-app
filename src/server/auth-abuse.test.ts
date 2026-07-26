import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    authRateLimit: { upsert: vi.fn() },
    authAuditLog: { create: vi.fn() },
  },
}));

import { prisma } from "../db";
import { enforceAuthRateLimit, hashIdentifier, hashOtp, normalizeEmail } from "./auth-abuse";

const prismaAny = prisma as any;

function request(ip = "203.0.113.10") {
  return new Request("https://example.com", { headers: { "x-forwarded-for": `${ip}, proxy` } });
}

describe("auth abuse helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OTP_HASH_SECRET", "test-secret");
    vi.mocked(prismaAny.authRateLimit.upsert).mockResolvedValue({ count: 1 });
    vi.mocked(prismaAny.authAuditLog.create).mockResolvedValue({});
  });

  it("normalizes email before lookup/hash boundaries", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });

  it("hashes identifiers without exposing raw value", () => {
    const first = hashIdentifier(" User@Example.COM ");
    const second = hashIdentifier("user@example.com");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("user@example.com");
  });

  it("enforces configured rate limit threshold and logs blocked attempt", async () => {
    vi.mocked(prismaAny.authRateLimit.upsert).mockResolvedValueOnce({ count: 6 });

    await expect(
      enforceAuthRateLimit({ event: "signup", email: "USER@example.com", request: request() }),
    ).rejects.toThrow("Terlalu banyak percobaan");

    expect(prismaAny.authAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ event: "signup", outcome: "blocked" }),
    });
  });

  it("does not block when the bucket count is within the configured limit", async () => {
    vi.mocked(prismaAny.authRateLimit.upsert).mockResolvedValueOnce({ count: 5 });

    await expect(
      enforceAuthRateLimit({ event: "signup", email: "USER@example.com", request: request() }),
    ).resolves.toBeUndefined();

    expect(prismaAny.authAuditLog.create).not.toHaveBeenCalled();
  });

  it("increments a single window bucket atomically per (event, scope, window)", async () => {
    await enforceAuthRateLimit({ event: "shipping_costs", request: request("198.51.100.3") });

    expect(prismaAny.authRateLimit.upsert).toHaveBeenCalledWith({
      where: {
        event_scopeKey_windowStart: expect.objectContaining({
          event: "shipping_costs",
          scopeKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      },
      update: { count: { increment: 1 } },
      create: expect.objectContaining({
        event: "shipping_costs",
        scopeKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        count: 1,
      }),
    });
  });

  it("stays consistent under concurrent hits by relying on the DB-atomic upsert increment (no local read-then-write race)", async () => {
    let stored = 0;
    vi.mocked(prismaAny.authRateLimit.upsert).mockImplementation(async () => {
      // Simulates Postgres ON CONFLICT DO UPDATE ... increment: each call is
      // a single atomic statement server-side, so concurrent callers never
      // observe/overwrite a stale count like a separate count()+create() would.
      stored += 1;
      return { count: stored };
    });

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        enforceAuthRateLimit({ event: "checkout", request: request("203.0.113.55") }),
      ),
    );

    const blocked = results.filter((r) => r.status === "rejected").length;
    const allowed = results.filter((r) => r.status === "fulfilled").length;

    // checkout limit is 20/10min; 8 concurrent hits from the same scope stay
    // under the limit and none are blocked, with the bucket ending at exactly 8.
    expect(allowed).toBe(8);
    expect(blocked).toBe(0);
    expect(stored).toBe(8);
  });

  it("requires OTP hash secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTP_HASH_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => hashOtp("123456")).toThrow("OTP_HASH_SECRET wajib diisi di production.");
  });
});
