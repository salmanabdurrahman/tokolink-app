import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    verificationCode: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    authRateLimit: {
      upsert: vi.fn(),
    },
    authAuditLog: {
      create: vi.fn(),
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

vi.mock("./email", () => ({
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock("../lib/supabase-jwt.server", () => ({
  canVerifySupabaseAccessTokenLocally: vi.fn(),
  verifySupabaseAccessTokenLocally: vi.fn(),
}));

import { prisma } from "../db";
import { supabaseAdmin } from "../lib/supabase.server";
import {
  canVerifySupabaseAccessTokenLocally,
  verifySupabaseAccessTokenLocally,
} from "../lib/supabase-jwt.server";
import { sendVerificationEmail } from "./email";
import {
  getSessionUser,
  syncSession,
  registerUser,
  resendSignUpCode,
  verifySignUpCode,
} from "./auth.functions";
import { __clearUserCacheForTests } from "./user-cache.server";

const prismaAny = prisma as any;
const getSessionUserHandler = getSessionUser as any;
const syncSessionHandler = syncSession as any;
const registerUserHandler = registerUser as any;
const resendSignUpCodeHandler = resendSignUpCode as any;
const verifySignUpCodeHandler = verifySignUpCode as any;

const email = "owner@example.com";
const password = "secret123";

const mockUser = { id: "user-1", supabaseId: "supa-1", email, name: "Owner", emailVerified: null };

const makeRequest = (cookie = "") => new Request("http://localhost", { headers: { cookie } });

beforeEach(() => {
  vi.mocked(prismaAny.user.findUnique).mockReset();
  vi.mocked(prismaAny.user.create).mockReset();
  vi.mocked(prismaAny.user.update).mockReset();
  vi.mocked(prismaAny.user.upsert).mockReset();
  vi.mocked(prismaAny.verificationCode.findUnique).mockReset();
  vi.mocked(prismaAny.verificationCode.upsert).mockReset();
  vi.mocked(prismaAny.verificationCode.update).mockReset();
  vi.mocked(prismaAny.verificationCode.delete).mockReset();
  vi.mocked(prismaAny.authRateLimit.upsert).mockReset();
  vi.mocked(prismaAny.authRateLimit.upsert).mockResolvedValue({ count: 1 });
  vi.mocked(prismaAny.authAuditLog.create).mockReset();
  vi.mocked(supabaseAdmin.auth.admin.createUser).mockReset();
  vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockReset();
  vi.mocked(canVerifySupabaseAccessTokenLocally).mockReset().mockReturnValue(false);
  vi.mocked(verifySupabaseAccessTokenLocally).mockReset();
  vi.mocked(supabaseAdmin.auth.getUser).mockReset();
  vi.mocked(sendVerificationEmail).mockReset().mockResolvedValue(undefined);
  __clearUserCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("registerUser", () => {
  it("creates Supabase and local user, then sends OTP for new user", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });

    await expect(registerUserHandler({ data: { email, password } })).resolves.toEqual({
      success: true,
      message: "Kode verifikasi telah dikirim.",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email, supabaseId: "supa-1", provider: "email", emailVerified: null },
    });
    expect(prisma.verificationCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email },
        create: expect.objectContaining({ email, codeHash: expect.any(String), attempts: 0 }),
        update: expect.objectContaining({
          codeHash: expect.any(String),
          attempts: 0,
          createdAt: expect.any(Date),
        }),
      }),
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(email, expect.stringMatching(/^\d{6}$/));
  });

  it("rejects already verified existing user", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue({
      ...mockUser,
      emailVerified: new Date(),
    });

    await expect(registerUserHandler({ data: { email, password } })).rejects.toThrow(
      "Email sudah terdaftar. Silakan masuk.",
    );
  });

  it("updates password and resends OTP for unverified existing user", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);

    await expect(registerUserHandler({ data: { email, password } })).resolves.toEqual({
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

    await expect(registerUserHandler({ data: { email, password } })).rejects.toThrow(
      "Supabase down",
    );
  });

  it("does not fail signup when verification email send fails (fire-and-forget)", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });
    vi.mocked(sendVerificationEmail).mockRejectedValue(new Error("email failed"));

    await expect(registerUserHandler({ data: { email, password } })).resolves.toEqual({
      success: true,
      message: "Kode verifikasi telah dikirim.",
    });
  });
});

describe("verifySignUpCode", () => {
  it("confirms email, deletes OTP, and returns success", async () => {
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValue({
      email,
      codeHash: "934a0e55ff9d8433503dbbe187c09046d089c8e32642d3f06551a8ac932a093e",
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
      codeHash: "934a0e55ff9d8433503dbbe187c09046d089c8e32642d3f06551a8ac932a093e",
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
      codeHash: "934a0e55ff9d8433503dbbe187c09046d089c8e32642d3f06551a8ac932a093e",
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
      codeHash: "934a0e55ff9d8433503dbbe187c09046d089c8e32642d3f06551a8ac932a093e",
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
      codeHash: "934a0e55ff9d8433503dbbe187c09046d089c8e32642d3f06551a8ac932a093e",
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
    await expect(resendSignUpCodeHandler({ data: { email } })).rejects.toThrow(
      "Email tidak terdaftar.",
    );

    vi.mocked(prismaAny.user.findUnique).mockResolvedValueOnce({
      ...mockUser,
      emailVerified: new Date(),
    });
    await expect(resendSignUpCodeHandler({ data: { email } })).rejects.toThrow(
      "Email sudah terverifikasi.",
    );
  });

  it("resends for unverified user outside cooldown", async () => {
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prismaAny.verificationCode.findUnique).mockResolvedValue({
      email,
      createdAt: new Date(Date.now() - 61_000),
    });

    await expect(resendSignUpCodeHandler({ data: { email } })).resolves.toEqual({
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

    await expect(resendSignUpCodeHandler({ data: { email } })).rejects.toThrow(
      /Tunggu \d+ detik sebelum mengirim ulang\./,
    );
  });
});

describe("getSessionUser", () => {
  it("returns null without cookie", async () => {
    await expect(getSessionUserHandler({ request: makeRequest() })).resolves.toBeNull();
  });

  it("returns null when Supabase token invalid (dev bypass)", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" },
    });

    await expect(
      getSessionUserHandler({ request: makeRequest("sb-access-token=bad") }),
    ).resolves.toBeNull();
  });

  it("returns user with tenant for valid session (dev bypass via getUser)", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue({
      ...mockUser,
      tenant: { id: "tenant-1", slug: "toko-test" },
    });

    const result = await getSessionUserHandler({
      request: makeRequest("sb-access-token=good"),
    });

    expect(result).toMatchObject({
      email,
      id: "user-1",
      tenant: { id: "tenant-1" },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supa-1" },
      include: { tenant: true },
    });
  });

  it("returns user via local JWT verification, skipping Supabase network call", async () => {
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(true);
    vi.mocked(verifySupabaseAccessTokenLocally).mockResolvedValue({ supabaseId: "supa-local" });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue({
      ...mockUser,
      supabaseId: "supa-local",
      tenant: { id: "tenant-1", slug: "toko-test" },
    });

    const result = await getSessionUserHandler({
      request: makeRequest("sb-access-token=good"),
    });

    expect(result).toMatchObject({ email, id: "user-1" });
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supa-local" },
      include: { tenant: true },
    });
  });

  it("returns null when local JWT verification fails", async () => {
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(true);
    vi.mocked(verifySupabaseAccessTokenLocally).mockResolvedValue(null);

    await expect(
      getSessionUserHandler({ request: makeRequest("sb-access-token=bad") }),
    ).resolves.toBeNull();
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it("returns null in production when JWT secret not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(false);

    await expect(
      getSessionUserHandler({ request: makeRequest("sb-access-token=good") }),
    ).resolves.toBeNull();
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });
});

describe("syncSession", () => {
  it("rejects missing token", async () => {
    await expect(syncSessionHandler({ data: {}, request: makeRequest() })).rejects.toThrow(
      "Tidak terautentikasi: Tidak ada token sesi",
    );
  });

  it("rejects invalid Supabase token", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" },
    });

    await expect(
      syncSessionHandler({ data: {}, request: makeRequest("sb-access-token=bad") }),
    ).rejects.toThrow("Tidak terautentikasi: Token sesi tidak valid");
  });

  it("rejects unverified email-only provider", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "supa-1",
          email,
          email_confirmed_at: null,
          app_metadata: { provider: "email" },
          user_metadata: {},
        },
      },
      error: null,
    });

    await expect(
      syncSessionHandler({ data: {}, request: makeRequest("sb-access-token=good") }),
    ).rejects.toThrow("Email belum diverifikasi.");
  });

  it("creates user when not found (create-if-missing) for email provider", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "supa-1",
          email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Owner" },
        },
      },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(prismaAny.user.create).mockResolvedValue({
      ...mockUser,
      name: "Owner",
      tenant: null,
    });

    const result = await syncSessionHandler({
      data: {},
      request: makeRequest("sb-access-token=good"),
    });

    expect(result).toMatchObject({ email, name: "Owner" });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email, supabaseId: "supa-1" }),
      }),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not write when nothing changed (read-first, no-op update)", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "supa-1",
          email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Owner" },
        },
      },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue({
      ...mockUser,
      name: "Owner",
      avatarUrl: null,
      provider: "email",
      emailVerified: new Date(),
      tenant: null,
    });

    const result = await syncSessionHandler({
      data: {},
      request: makeRequest("sb-access-token=good"),
    });

    expect(result).toMatchObject({ email, name: "Owner" });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("updates only when metadata actually changed", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "supa-1",
          email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "New Name" },
        },
      },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue({
      ...mockUser,
      name: "Owner",
      avatarUrl: null,
      provider: "email",
      emailVerified: new Date(),
      tenant: null,
    });
    vi.mocked(prismaAny.user.update).mockResolvedValue({
      ...mockUser,
      name: "New Name",
      tenant: null,
    });

    const result = await syncSessionHandler({
      data: {},
      request: makeRequest("sb-access-token=good"),
    });

    expect(result).toMatchObject({ email, name: "New Name" });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { supabaseId: "supa-1" },
        data: expect.objectContaining({ name: "New Name" }),
      }),
    );
  });

  it("sets emailVerified immediately for OAuth provider on create", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "supa-2",
          email,
          email_confirmed_at: null,
          app_metadata: { provider: "google" },
          user_metadata: {},
        },
      },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);
    vi.mocked(prismaAny.user.create).mockResolvedValue({
      ...mockUser,
      supabaseId: "supa-2",
      emailVerified: new Date(),
      tenant: null,
    });

    await syncSessionHandler({
      data: {},
      request: makeRequest("sb-access-token=oauth"),
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailVerified: expect.any(Date),
          provider: "google",
        }),
      }),
    );
  });

  it("recovers from a concurrent create race (duplicate signup, multi-tab)", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "supa-1",
          email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Owner" },
        },
      },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...mockUser, name: "Owner", tenant: null });
    vi.mocked(prismaAny.user.create).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const result = await syncSessionHandler({
      data: {},
      request: makeRequest("sb-access-token=good"),
    });

    expect(result).toMatchObject({ email, name: "Owner" });
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
  });
});
