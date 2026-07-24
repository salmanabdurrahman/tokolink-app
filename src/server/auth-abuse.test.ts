import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    authRateLimit: { count: vi.fn(), create: vi.fn() },
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
    vi.mocked(prismaAny.authRateLimit.count).mockResolvedValue(0);
    vi.mocked(prismaAny.authRateLimit.create).mockResolvedValue({});
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
    vi.mocked(prismaAny.authRateLimit.count).mockResolvedValueOnce(5);

    await expect(
      enforceAuthRateLimit({ event: "signup", email: "USER@example.com", request: request() }),
    ).rejects.toThrow("Terlalu banyak percobaan");

    expect(prismaAny.authRateLimit.create).not.toHaveBeenCalled();
    expect(prismaAny.authAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ event: "signup", outcome: "blocked" }),
    });
  });

  it("records successful rate-limit attempt with hashed scope", async () => {
    await enforceAuthRateLimit({ event: "shipping_costs", request: request("198.51.100.3") });

    expect(prismaAny.authRateLimit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: "shipping_costs",
        scopeKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it("requires OTP hash secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTP_HASH_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => hashOtp("123456")).toThrow("OTP_HASH_SECRET wajib diisi di production.");
  });
});
