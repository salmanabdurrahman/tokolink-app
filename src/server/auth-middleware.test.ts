import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { prisma } from "../db";
import { supabaseAdmin } from "../lib/supabase.server";
import { authMiddleware } from "./auth-middleware";

const prismaAny = prisma as any;
const authMiddlewareHandler = authMiddleware as any;

const requestWithCookie = (cookie = "") => new Request("http://localhost", { headers: { cookie } });

beforeEach(() => {
  vi.mocked(prismaAny.user.findUnique).mockReset();
  vi.mocked(supabaseAdmin.auth.getUser).mockReset();
});

describe("authMiddleware", () => {
  it("rejects missing cookie", async () => {
    await expect(
      authMiddlewareHandler({ request: requestWithCookie(), next: vi.fn() }),
    ).rejects.toThrow("Unauthorized: No session token found");
  });

  it("rejects invalid token", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: null }, error: {} });

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=bad"), next: vi.fn() }),
    ).rejects.toThrow("Unauthorized: Invalid session");
  });

  it("rejects when local user does not exist", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "supa-1" } },
      error: null,
    });
    vi.mocked(prismaAny.user.findUnique).mockResolvedValue(null);

    await expect(
      authMiddlewareHandler({ request: requestWithCookie("sb-access-token=good"), next: vi.fn() }),
    ).rejects.toThrow("Unauthorized: User not found in database");
  });

  it("passes user and tenant context for valid session", async () => {
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
});
