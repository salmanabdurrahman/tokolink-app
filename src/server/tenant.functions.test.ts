import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    tenant: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./recaptcha", () => ({ verifyRecaptcha: vi.fn(async () => true) }));

import { prisma } from "../db";
import { createTenant } from "./tenant.functions";

const prismaAny = prisma as any;
const createTenantHandler = createTenant as any;

const context = { user: { id: "user-1" } };
const data = { slug: "toko-test", name: "Toko Test", tagline: "", avatar: "", whatsapp: "" };

beforeEach(() => {
  vi.mocked(prismaAny.tenant.findUnique).mockReset();
  vi.mocked(prismaAny.tenant.create).mockReset();
});

describe("createTenant", () => {
  it("rejects duplicate slug", async () => {
    vi.mocked(prismaAny.tenant.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "other-tenant" });

    await expect(createTenantHandler({ data, context })).rejects.toThrow(
      "Domain/slug toko ini sudah digunakan",
    );
  });

  it("rejects user that already has tenant", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValueOnce({ id: "tenant-1" });

    await expect(createTenantHandler({ data, context })).rejects.toThrow(
      "User already has an onboarding tenant",
    );
  });

  it("creates tenant with default DiceBear avatar", async () => {
    const tenant = { id: "tenant-1", ...data, userId: "user-1" };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(prismaAny.tenant.create).mockResolvedValue(tenant);

    await expect(createTenantHandler({ data, context })).resolves.toEqual(tenant);
    expect(prisma.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: data.slug,
        name: data.name,
        avatar: expect.stringContaining("https://api.dicebear.com/9.x/initials/svg"),
        userId: "user-1",
      }),
    });
  });
});
