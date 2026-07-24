import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    verificationCode: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../lib/supabase.server", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
        updateUserById: vi.fn(),
      },
      getUser: vi.fn(),
    },
  },
}));

vi.mock("./recaptcha", () => ({ verifyRecaptcha: vi.fn(async () => true) }));
vi.mock("./email", () => ({
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}));

import { prisma } from "../db";
import { supabaseAdmin } from "../lib/supabase.server";
import { sendVerificationEmail } from "./email";
import { verifyRecaptcha } from "./recaptcha";
import { registerUser, resendSignUpCode, verifySignUpCode } from "./auth.functions";

const prismaAny = prisma as any;
const registerUserHandler = registerUser as any;
const resendSignUpCodeHandler = resendSignUpCode as any;
const verifySignUpCodeHandler = verifySignUpCode as any;

const email = "owner@example.com";
const password = "secret123";
const recaptchaToken = "human-token";

const mockUser = { id: "user-1", supabaseId: "supa-1", email, name: "Owner", emailVerified: null };

beforeEach(() => {
  vi.mocked(verifyRecaptcha).mockResolvedValue(true);
  vi.mocked(prismaAny.user.findUnique).mockReset();
  vi.mocked(prismaAny.user.create).mockReset();
  vi.mocked(prismaAny.user.update).mockReset();
  vi.mocked(prismaAny.verificationCode.findUnique).mockReset();
  vi.mocked(prismaAny.verificationCode.upsert).mockReset();
  vi.mocked(prismaAny.verificationCode.update).mockReset();
  vi.mocked(prismaAny.verificationCode.delete).mockReset();
  vi.mocked(supabaseAdmin.auth.admin.createUser).mockReset();
  vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockReset();
  vi.mocked(sendVerificationEmail).mockReset();
});

describe("registerUser", () => {
  it("creates Supabase and local user, then sends OTP for new user", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });

    await expect(
      registerUserHandler({ data: { email, password, recaptchaToken } }),
    ).resolves.toEqual({
      success: true,
      message: "Kode verifikasi telah dikirim.",
    });

    expect(verifyRecaptcha).toHaveBeenCalledWith(recaptchaToken, "signup");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email, supabaseId: "supa-1", provider: "email", emailVerified: null },
    });
    expect(prisma.verificationCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email },
        create: expect.objectContaining({ email, attempts: 0 }),
        update: expect.objectContaining({ attempts: 0, createdAt: expect.any(Date) }),
      }),
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(email, expect.stringMatching(/^\d{6}$/));
  });

  it("rejects already verified existing user", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue({
      ...mockUser,
      emailVerified: new Date(),
    });

    await expect(
      registerUserHandler({ data: { email, password, recaptchaToken } }),
    ).rejects.toThrow("Email sudah terdaftar. Silakan masuk.");
  });

  it("updates password and resends OTP for unverified existing user", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);

    await expect(
      registerUserHandler({ data: { email, password, recaptchaToken } }),
    ).resolves.toEqual({
      success: true,
      message: "Kode verifikasi telah dikirim ulang.",
    });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("supa-1", { password });
    expect(sendVerificationEmail).toHaveBeenCalledWith(email, expect.stringMatching(/^\d{6}$/));
  });

  it("surfaces Supabase create errors", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: null },
      error: { message: "Supabase down" },
    });

    await expect(
      registerUserHandler({ data: { email, password, recaptchaToken } }),
    ).rejects.toThrow("Supabase down");
  });

  it("fails when verification email cannot be sent", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });
    vi.mocked(sendVerificationEmail).mockRejectedValue(new Error("email failed"));

    await expect(
      registerUserHandler({ data: { email, password, recaptchaToken } }),
    ).rejects.toThrow("email failed");
  });
});

describe("verifySignUpCode", () => {
  it("confirms email, deletes OTP, and returns success", async () => {
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValue({
      email,
      code: "123456",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({ data: {}, error: null });

    await expect(verifySignUpCodeHandler({ data: { email, code: "123456" } })).resolves.toEqual({
      success: true,
      message: "Email berhasil diverifikasi.",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email },
      data: { emailVerified: expect.any(Date) },
    });
    expect(prisma.verificationCode.delete).toHaveBeenCalledWith({ where: { email } });
  });

  it("rejects missing and expired code", async () => {
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValueOnce(null);
    await expect(verifySignUpCodeHandler({ data: { email, code: "123456" } })).rejects.toThrow(
      "Kode verifikasi tidak ditemukan. Silakan kirim ulang.",
    );

    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValueOnce({
      email,
      code: "123456",
      attempts: 0,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(verifySignUpCodeHandler({ data: { email, code: "123456" } })).rejects.toThrow(
      "Kode verifikasi telah kedaluwarsa. Silakan kirim ulang.",
    );
  });

  it("increments attempts for wrong code and deletes after max attempts", async () => {
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValueOnce({
      email,
      code: "123456",
      attempts: 1,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(verifySignUpCodeHandler({ data: { email, code: "000000" } })).rejects.toThrow(
      "Kode verifikasi salah. Sisa percobaan: 3",
    );
    expect(prisma.verificationCode.update).toHaveBeenCalledWith({
      where: { email },
      data: { attempts: 2 },
    });

    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValueOnce({
      email,
      code: "123456",
      attempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(verifySignUpCodeHandler({ data: { email, code: "000000" } })).rejects.toThrow(
      "Terlalu banyak percobaan salah. Silakan minta kode baru.",
    );
    expect(prisma.verificationCode.delete).toHaveBeenCalledWith({ where: { email } });
  });

  it("surfaces Supabase confirm failure", async () => {
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValue({
      email,
      code: "123456",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
      data: {},
      error: { message: "confirm failed" },
    });

    await expect(verifySignUpCodeHandler({ data: { email, code: "123456" } })).rejects.toThrow(
      "confirm failed",
    );
  });
});

describe("resendSignUpCode", () => {
  it("rejects missing or verified users", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValueOnce(null);
    await expect(resendSignUpCodeHandler({ data: { email, recaptchaToken } })).rejects.toThrow(
      "Email tidak terdaftar.",
    );

    vi.mocked(prismaAny.user.findUnique).mockResolvedValueOnce({
      ...mockUser,
      emailVerified: new Date(),
    });
    await expect(resendSignUpCodeHandler({ data: { email, recaptchaToken } })).rejects.toThrow(
      "Email sudah terverifikasi.",
    );
  });

  it("resends for unverified user outside cooldown", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValue({
      email,
      createdAt: new Date(Date.now() - 61_000),
    });

    await expect(resendSignUpCodeHandler({ data: { email, recaptchaToken } })).resolves.toEqual({
      success: true,
      message: "Kode verifikasi baru dikirim.",
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith(email, expect.stringMatching(/^\d{6}$/));
  });

  it("enforces current resend cooldown as rate-limit placeholder", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValue({
      email,
      createdAt: new Date(),
    });

    await expect(resendSignUpCodeHandler({ data: { email, recaptchaToken } })).rejects.toThrow(
      /Tunggu \d+ detik sebelum mengirim ulang\./,
    );
  });
});
