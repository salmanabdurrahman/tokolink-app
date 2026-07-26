import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    tenant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    order: { count: vi.fn() },
    product: { count: vi.fn() },
    link: { count: vi.fn() },
    authRateLimit: { upsert: vi.fn() },
    authAuditLog: { create: vi.fn() },
    media: { findFirst: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./storage", () => ({ storage: { deleteObject: vi.fn() } }));

import { prisma } from "../db";
import { clearStorefrontCatalogCache } from "./catalog.queries.server";
import {
  createTenant,
  getDashboardData,
  getMyTenant,
  getMyTenantLinks,
  getMyTenantProducts,
  getMyTenantSettings,
  getTenant,
  updateTenant,
} from "./tenant.functions";

const prismaAny = prisma as any;
const createTenantHandler = createTenant as any;
const getDashboardDataHandler = getDashboardData as any;
const getMyTenantHandler = getMyTenant as any;
const getMyTenantProductsHandler = getMyTenantProducts as any;
const getMyTenantLinksHandler = getMyTenantLinks as any;
const getMyTenantSettingsHandler = getMyTenantSettings as any;
const getTenantHandler = getTenant as any;
const updateTenantHandler = updateTenant as any;

const context = { user: { id: "user-1" }, tenant: { id: "tenant-1", slug: "toko-test" } };
const data = {
  slug: "toko-test",
  name: "Toko Test",
  tagline: "",
  avatar: "",
  whatsapp: "",
};

beforeEach(() => {
  vi.mocked(prismaAny.tenant.findUnique).mockReset();
  vi.mocked(prismaAny.tenant.create).mockReset();
  vi.mocked(prismaAny.tenant.update).mockReset();
  vi.mocked(prismaAny.order.count).mockReset();
  vi.mocked(prismaAny.product.count).mockReset();
  vi.mocked(prismaAny.link.count).mockReset();
  vi.mocked(prismaAny.authRateLimit.upsert).mockReset();
  vi.mocked(prismaAny.authRateLimit.upsert).mockResolvedValue({ count: 1 });
  vi.mocked(prismaAny.authAuditLog.create).mockReset();
  vi.mocked(prismaAny.media.findFirst).mockReset();
  vi.mocked(prismaAny.media.delete).mockReset();
  clearStorefrontCatalogCache();
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

  it("caches storefront catalog within the same runtime window", async () => {
    const mockTenant = { id: "tenant-1", slug: "toko-test", links: [], products: [] };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getTenantHandler({ data: "toko-test" })).resolves.toEqual(mockTenant);
    await expect(getTenantHandler({ data: "toko-test" })).resolves.toEqual(mockTenant);

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });

  it("throws when slug not found", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    await expect(getTenantHandler({ data: "invalid-slug" })).rejects.toThrow(
      'Toko dengan slug "invalid-slug" tidak ditemukan',
    );
  });
});

describe("getDashboardData", () => {
  it("loads tenant summary and counts with one server function", async () => {
    const mockTenant = { slug: "toko-test", name: "Toko Test" };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);
    vi.mocked(prismaAny.order.count).mockResolvedValue(2);
    vi.mocked(prismaAny.product.count).mockResolvedValue(4);
    vi.mocked(prismaAny.link.count).mockResolvedValue(3);

    await expect(getDashboardDataHandler({ context })).resolves.toEqual({
      tenant: { ...mockTenant, links: [], products: [] },
      orderCount: 2,
      productCount: 4,
      linkCount: 3,
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: expect.objectContaining({ slug: true, name: true }),
    });
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: expect.not.objectContaining({ originName: true, allowedCouriers: true }),
    });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", status: "PAID" },
    });
    expect(prisma.product.count).toHaveBeenCalledWith({ where: { tenantId: "tenant-1" } });
    expect(prisma.link.count).toHaveBeenCalledWith({ where: { tenantId: "tenant-1" } });
  });
});

describe("getMyTenant", () => {
  it("returns full tenant catalog for the authenticated user", async () => {
    const mockTenant = { id: "tenant-1", slug: "toko-test", products: [], links: [] };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getMyTenantHandler({ context })).resolves.toEqual(mockTenant);
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: expect.any(Object),
    });
  });

  it("returns null when the user has no tenant yet", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    await expect(getMyTenantHandler({ context })).resolves.toBeNull();
  });
});

describe("getMyTenantSettings", () => {
  it("selects identity fields and fills empty catalog arrays", async () => {
    const mockTenant = { slug: "toko-test", name: "Toko Test" };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getMyTenantSettingsHandler({ context })).resolves.toEqual({
      ...mockTenant,
      products: [],
      links: [],
    });
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: expect.any(Object),
    });
  });

  it("returns null when the user has no tenant yet", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    await expect(getMyTenantSettingsHandler({ context })).resolves.toBeNull();
  });
});

describe("getMyTenantProducts", () => {
  it("selects catalog identity without origin/shipping columns", async () => {
    const mockTenant = { slug: "toko-test", name: "Toko Test", products: [] };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getMyTenantProductsHandler({ context })).resolves.toEqual({
      ...mockTenant,
      links: [],
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: expect.not.objectContaining({ originName: true, rajaOngkirOriginId: true }),
    });
  });

  it("returns null when tenant not found", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    await expect(getMyTenantProductsHandler({ context })).resolves.toBeNull();
  });
});

describe("getMyTenantLinks", () => {
  it("selects catalog identity without origin/shipping columns", async () => {
    const mockTenant = { slug: "toko-test", name: "Toko Test", links: [] };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getMyTenantLinksHandler({ context })).resolves.toEqual({
      ...mockTenant,
      products: [],
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: expect.not.objectContaining({ originAddress: true, allowedCouriers: true }),
    });
  });

  it("returns null when tenant not found", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);

    await expect(getMyTenantLinksHandler({ context })).resolves.toBeNull();
  });
});

describe("getDashboardData without a resolved tenant", () => {
  it("skips count queries and defaults them to 0 when context has no tenant", async () => {
    const mockTenant = { slug: "toko-test", name: "Toko Test" };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(mockTenant);

    await expect(getDashboardDataHandler({ context: { user: { id: "user-1" } } })).resolves.toEqual(
      {
        tenant: { ...mockTenant, links: [], products: [] },
        orderCount: 0,
        productCount: 0,
        linkCount: 0,
      },
    );

    expect(prisma.order.count).not.toHaveBeenCalled();
    expect(prisma.product.count).not.toHaveBeenCalled();
    expect(prisma.link.count).not.toHaveBeenCalled();
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

  it("deletes the previous avatar media when it changes", async () => {
    const { storage } = await import("./storage");
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(prismaAny.tenant.update).mockResolvedValue({
      id: "tenant-1",
      slug: "toko-test",
      avatar: "https://cdn.test/new-avatar.png",
    });
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue({
      id: "media-1",
      key: "tenants/tenant-1/old-avatar.png",
    });
    vi.mocked(prismaAny.media.delete).mockResolvedValue({ id: "media-1" });

    const contextWithOldAvatar = {
      ...context,
      tenant: { ...context.tenant, avatar: "https://cdn.test/old-avatar.png" },
    };

    await updateTenantHandler({
      data: { avatar: "https://cdn.test/new-avatar.png" },
      context: contextWithOldAvatar,
    });

    expect(storage.deleteObject).toHaveBeenCalledWith("tenants/tenant-1/old-avatar.png");
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: "media-1" } });
  });

  it("does not touch media when avatar is unchanged", async () => {
    const { storage } = await import("./storage");
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(prismaAny.tenant.update).mockResolvedValue({
      id: "tenant-1",
      slug: "toko-test",
      name: "Updated",
    });

    await updateTenantHandler({ data: { name: "Updated" }, context });

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("clears cached storefront catalog after tenant update", async () => {
    const cachedTenant = { id: "tenant-1", slug: "toko-test", name: "Before" };
    const updatedTenant = { id: "tenant-1", slug: "toko-test", name: "Updated" };
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(cachedTenant);

    await expect(getTenantHandler({ data: "toko-test" })).resolves.toEqual(cachedTenant);
    vi.mocked(prismaAny.tenant.findUnique).mockClear();
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue(updatedTenant);
    vi.mocked(prismaAny.tenant.update).mockResolvedValue(updatedTenant);

    await expect(updateTenantHandler({ data: { name: "Updated" }, context })).resolves.toEqual(
      updatedTenant,
    );
    await expect(getTenantHandler({ data: "toko-test" })).resolves.toEqual(updatedTenant);

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });
});
