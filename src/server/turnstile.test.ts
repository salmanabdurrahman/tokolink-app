import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("verifyTurnstile", () => {
  it("accepts successful verification", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, action: "signup", hostname: "localhost" }),
    } as Response);

    await expect(verifyTurnstile("token", "signup")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
  });

  it("rejects failed verification and invalid secret responses", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-secret"] }),
    } as Response);

    await expect(verifyTurnstile("token", "signup")).resolves.toBe(false);
  });

  it("rejects network errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    await expect(verifyTurnstile("token", "signup")).resolves.toBe(false);
  });

  it("rejects action mismatch", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, action: "resend_signup_code", hostname: "localhost" }),
    } as Response);

    await expect(verifyTurnstile("token", "signup")).resolves.toBe(false);
  });

  it("rejects hostname mismatch when allowlist is configured", async () => {
    process.env.TURNSTILE_ALLOWED_HOSTNAMES = "tokolink.test";
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, action: "signup", hostname: "evil.test" }),
    } as Response);

    await expect(verifyTurnstile("token", "signup")).resolves.toBe(false);
  });

  it("bypasses missing secret outside production only", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = "development";
    await expect(verifyTurnstile("disabled", "signup")).resolves.toBe(true);

    process.env.NODE_ENV = "production";
    await expect(verifyTurnstile("disabled", "signup")).resolves.toBe(false);
  });
});
