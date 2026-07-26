import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../db";
import {
  clearStorefrontCatalogCache,
  getCheckoutCatalogBySlug,
  getOgTenantBySlug,
  getShippingCatalogBySlug,
  getStorefrontCatalogBySlug,
  listSitemapTenants,
  withEmptyCatalog,
} from "./catalog.queries.server";

const prismaAny = prisma as any;

describe("catalog.queries.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    clearStorefrontCatalogCache();
  });

  afterEach(() => {
    clearStorefrontCatalogCache();
  });

  it("returns tenant with empty links/products when catalog is empty", () => {
    expect(withEmptyCatalog({ slug: "toko" })).toEqual({
      slug: "toko",
      links: [],
      products: [],
      categories: [],
    });
  });

  it("returns null when tenant is null for empty catalog helper", () => {
    expect(withEmptyCatalog(null)).toBeNull();
  });

  it("fetches storefront catalog by slug and caches the promise on cache miss", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({
      slug: "toko",
      links: [],
      products: [],
    });

    const first = await getStorefrontCatalogBySlug("toko");
    const second = await getStorefrontCatalogBySlug("toko");

    expect(first).toEqual({ slug: "toko", links: [], products: [] });
    expect(second).toEqual({ slug: "toko", links: [], products: [] });
    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });

  it("removes cache entry when tenant is not found so future lookups retry", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValueOnce({ slug: "toko" });

    await expect(getStorefrontCatalogBySlug("toko")).resolves.toBeNull();
    await expect(getStorefrontCatalogBySlug("toko")).resolves.toEqual({ slug: "toko" });

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(2);
  });

  it("clears cache entry and rethrows when the catalog lookup rejects", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockRejectedValueOnce(new Error("db down"));
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValueOnce({ slug: "toko" });

    await expect(getStorefrontCatalogBySlug("toko")).rejects.toThrow("db down");
    await expect(getStorefrontCatalogBySlug("toko")).resolves.toEqual({ slug: "toko" });

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(2);
  });

  it("evicts oldest cache entry once cache size reaches the max entries limit", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ slug: "any" });

    for (let i = 0; i < 501; i++) {
      await getStorefrontCatalogBySlug(`toko-${i}`);
    }

    // First slug should have been evicted, so refetching it triggers prisma again.
    const callsBefore = vi.mocked(prismaAny.tenant.findUnique).mock.calls.length;
    await getStorefrontCatalogBySlug("toko-0");
    expect(vi.mocked(prismaAny.tenant.findUnique).mock.calls.length).toBe(callsBefore + 1);
  });

  it("clears a single cache entry by slug", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ slug: "toko" });

    await getStorefrontCatalogBySlug("toko");
    clearStorefrontCatalogCache("toko");
    await getStorefrontCatalogBySlug("toko");

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(2);
  });

  it("clears the entire cache when called without a slug", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ slug: "toko" });

    await getStorefrontCatalogBySlug("toko");
    clearStorefrontCatalogCache();
    await getStorefrontCatalogBySlug("toko");

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(2);
  });

  it("fetches checkout catalog scoped to given product ids", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ slug: "toko", products: [] });

    await getCheckoutCatalogBySlug("toko", ["p1", "p2"]);

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "toko" },
      include: {
        products: {
          where: { id: { in: ["p1", "p2"] } },
          include: { variantGroups: { include: { options: true } } },
        },
      },
    });
  });

  it("fetches shipping catalog scoped to given product ids", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ slug: "toko", products: [] });

    await getShippingCatalogBySlug("toko", ["p1"]);

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "toko" },
      include: { products: { where: { id: { in: ["p1"] } } } },
    });
  });

  it("fetches og tenant with latest 3 products", async () => {
    vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({ slug: "toko", products: [] });

    await getOgTenantBySlug("toko");

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "toko" },
      include: {
        products: {
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("lists tenants for sitemap generation", async () => {
    vi.mocked(prismaAny.tenant.findMany).mockResolvedValue([
      { slug: "toko", updatedAt: new Date() },
    ]);

    await listSitemapTenants();

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      select: { slug: true, updatedAt: true },
    });
  });
});
