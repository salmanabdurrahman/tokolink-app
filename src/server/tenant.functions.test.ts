import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    tenant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./recaptcha", () => ({ verifyRecaptcha: vi.fn(async () => true) }));

import { prisma } from "../db";
import { createTenant, getTenant, updateTenant } from "./tenant.functions";

const prismaAny = prisma as any;
const createTenantHandler = createTenant as any;
const getTenantHandler = getTenant as any;
const updateTenantHandler = updateTenant as any;

const context = { user: { id: "user-1" }, tenant: { id: "tenant-1", slug: "toko-test" } };
const data = { slug: "toko-test", name: "Toko Test", tagline: "", avatar: "", whatsapp: "" };

beforeEach(() => {
  vi.mocked(prismaAny.tenant.findUnique).mockReset();
  vi.mocked(prismaAny.tenant.create).mockReset();
  vi.mocked(prismaAny.tenant.update).mockReset();
});

describe("getTenant", () => {
  it("returns tenant with links and products for valid slug", async () => {
    const mockTenant = { id: "tenant-1", slug: "toko-test", links: [], products: [] };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getTenantHandler({ data: "toko-test" })).resolves.toEqual(mockTenant);
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "toko-test" },
      include: expect.objectContaining({ links: expect.any(Object), products: expect.any(Object) }),
    });
  });

  it("throws when slug not found", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    await expect(getTenantHandler({ data: "invalid-slug" })).rejects.toThrow(
      'Toko dengan slug "invalid-slug" tidak ditemukan',
    );
  });
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
      "Anda sudah memiliki toko",
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

describe("updateTenant", () => {
  it("throws when user has no tenant", async () => {
    await expect(
      updateTenantHandler({ data: { name: "Updated" }, context: { user: { id: "user-1" } } }),
    ).rejects.toThrow("Toko tidak ditemukan untuk pengguna ini");
  });

  it("rejects slug conflict", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ id: "other-tenant", slug: "other" });

    await expect(updateTenantHandler({ data: { slug: "other" }, context })).rejects.toThrow(
      "Domain/slug toko ini sudah digunakan",
    );
  });

  it("updates tenant fields successfully", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(prismaAny.tenant.update).mockResolvedValue({
      id: "tenant-1",
      slug: "toko-test",
      name: "Updated",
    });

    await expect(updateTenantHandler({ data: { name: "Updated" }, context })).resolves.toEqual({
      id: "tenant-1",
      slug: "toko-test",
      name: "Updated",
    });
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { name: "Updated" },
    });
  });
});
