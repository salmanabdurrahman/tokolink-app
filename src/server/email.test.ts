import { describe, expect, it } from "vitest";

// Smoke tests: verify email functions exist and accept expected params
import { sendVerificationEmail, sendWelcomeEmail } from "./email";

describe("sendVerificationEmail", () => {
  it("is a function accepting email and code", () => {
    expect(typeof sendVerificationEmail).toBe("function");
    expect(sendVerificationEmail.length).toBe(2);
  });

  it("resolves without throwing (dev fallback or Resend call)", async () => {
    await expect(sendVerificationEmail("test@example.com", "123456")).resolves.toBeUndefined();
  });
});

describe("sendWelcomeEmail", () => {
  it("is a function accepting email and name", () => {
    expect(typeof sendWelcomeEmail).toBe("function");
    expect(sendWelcomeEmail.length).toBe(2);
  });

  it("resolves without throwing (dev fallback or Resend call)", async () => {
    await expect(sendWelcomeEmail("user@example.com", "User")).resolves.toBeUndefined();

    await expect(sendWelcomeEmail("user@example.com", "user@example.com")).resolves.toBeUndefined();
  });
});
