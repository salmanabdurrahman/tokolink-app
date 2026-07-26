import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../lib/supabase.server", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
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
import { authMiddleware } from "./auth-middleware";
import { __clearUserCacheForTests } from "./user-cache.server";

const prismaAny = prisma as any;
const authMiddlewareHandler = authMiddleware as any;

const requestWithCookie = (cookie = "") => new Request("http://localhost", { headers: { cookie } });

beforeEach(() => {
  vi.mocked(prismaAny.user.findUnique).mockReset();
  vi.mocked(supabaseAdmin.auth.getUser).mockReset();
  vi.mocked(canVerifySupabaseAccessTokenLocally).mockReset().mockReturnValue(false);
  vi.mocked(verifySupabaseAccessTokenLocally).mockReset();
  __clearUserCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authMiddleware", () => {
  it("rejects missing cookie", async () => {
    await expect(
      authMiddlewareHandler({ request: requestWithCookie(), next: vi.fn() }),
    ).rejects.toThrow("Tidak terautentikasi: Tidak ada token sesi");
  });

  it("rejects invalid token", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: null }, error: {} });

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=bad"), next: vi.fn() }),
    ).rejects.toThrow("Tidak terautentikasi: Sesi tidak valid");
  });

  it("rejects when local user does not exist", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next: vi.fn() }),
    ).rejects.toThrow("Tidak terautentikasi: Pengguna tidak ditemukan");
  });

  it("passes user and tenant context for valid session (dev bypass via getUser)", async () => {
    const user = { id: "user-1", supabaseId: "supa-1", tenant: { id: "tenant-1" } };
    const next = vi.fn(async ({ context }) => context);
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(user);

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next }),
    ).resolves.toEqual({ user, tenant: user.tenant });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supa-1" },
      include: { tenant: true },
    });
  });

  it("verifies locally and skips Supabase network call when JWT secret configured", async () => {
    const user = { id: "user-1", supabaseId: "supa-local", tenant: { id: "tenant-1" } };
    const next = vi.fn(async ({ context }) => context);
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(true);
    vi.mocked(verifySupabaseAccessTokenLocally).mockResolvedValue({ supabaseId: "supa-local" });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(user);

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next }),
    ).resolves.toEqual({ user, tenant: user.tenant });
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supa-local" },
      include: { tenant: true },
    });
  });

  it("rejects when local verification fails", async () => {
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(true);
    vi.mocked(verifySupabaseAccessTokenLocally).mockResolvedValue(null);

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=bad"), next: vi.fn() }),
    ).rejects.toThrow("Tidak terautentikasi: Sesi tidak valid");
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it("rejects in production when JWT secret is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(false);

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next: vi.fn() }),
    ).rejects.toThrow("Tidak terautentikasi: Konfigurasi sesi tidak lengkap");
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it("reuses cached user across calls within TTL, skipping a second Prisma query", async () => {
    const user = { id: "user-1", supabaseId: "supa-1", tenant: { id: "tenant-1" } };
    const next = vi.fn(async ({ context }) => context);
    vi.mocked(canVerifySupabaseAccessTokenLocally).mockReturnValue(true);
    vi.mocked(verifySupabaseAccessTokenLocally).mockResolvedValue({ supabaseId: "supa-1" });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(user);

    await authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next });
    await authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next });

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });
});
