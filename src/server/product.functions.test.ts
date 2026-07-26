import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    productCategory: { findFirst: vi.fn() },
    productVariantGroup: { deleteMany: vi.fn() },
    media: { findFirst: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (callbackOrQueries) => {
      if (Array.isArray(callbackOrQueries)) return Promise.all(callbackOrQueries);
      return callbackOrQueries({
        product: { update: vi.fn() },
        productVariantGroup: { deleteMany: vi.fn() },
      });
    }),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./storage", () => ({ storage: { deleteObject: vi.fn() } }));

import { prisma } from "../db";
import {
  createProduct,
  deleteProduct,
  getProducts,
  reorderProducts,
  updateProduct,
} from "./product.functions";

const prismaAny = prisma as any;
const updateProductHandler = updateProduct as any;
const deleteProductHandler = deleteProduct as any;
const getProductsHandler = getProducts as any;
const createProductHandler = createProduct as any;
const reorderProductHandler = reorderProducts as any;

const tenantContext = { tenant: { id: "tenant-1" } };
const noTenantContext = { user: { id: "user-1" } };
const otherId = "11111111-1111-4111-8111-111111111111";

describe("product ownership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue(null);
  });

  it("rejects product update/delete when product belongs to another tenant", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue(null);

    await expect(
      updateProductHandler({
        data: { id: otherId, data: { name: "Produk" } },
        context: tenantContext,
      }),
    ).rejects.toThrow("Produk tidak ditemukan atau bukan milik toko Anda");

    await expect(deleteProductHandler({ data: otherId, context: tenantContext })).rejects.toThrow(
      "Produk tidak ditemukan atau bukan milik toko Anda",
    );
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });
});

describe("deleteProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes tenant-owned product, clears cache, and removes its media", async () => {
    const { storage } = await import("./storage");
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
      image: "https://cdn.test/produk.png",
    });
    vi.mocked(prismaAny.product.delete).mockResolvedValue({ id: otherId });
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue({
      id: "media-1",
      key: "tenants/tenant-1/produk.png",
    });
    vi.mocked(prismaAny.media.delete).mockResolvedValue({ id: "media-1" });

    await expect(deleteProductHandler({ data: otherId, context: tenantContext })).resolves.toEqual({
      success: true,
    });

    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: otherId } });
    expect(storage.deleteObject).toHaveBeenCalledWith("tenants/tenant-1/produk.png");
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: "media-1" } });
  });

  it("deletes tenant-owned product without touching media when it has no tracked image", async () => {
    const { storage } = await import("./storage");
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
      image: "",
    });
    vi.mocked(prismaAny.product.delete).mockResolvedValue({ id: otherId });

    await expect(deleteProductHandler({ data: otherId, context: tenantContext })).resolves.toEqual({
      success: true,
    });

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});

describe("product update transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue(null);
  });

  it("replaces variants inside transaction", async () => {
    const tx = {
      product: { update: vi.fn().mockResolvedValue({ id: otherId, name: "Produk Baru" }) },
      productVariantGroup: { deleteMany: vi.fn() },
    };
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({ id: otherId, tenantId: "tenant-1" });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      updateProductHandler({
        data: {
          id: otherId,
          data: {
            name: "Produk Baru",
            variantGroups: [{ name: "Ukuran", options: [{ name: "M", priceDelta: 1000 }] }],
          },
        },
        context: tenantContext,
      }),
    ).resolves.toEqual({ id: otherId, name: "Produk Baru" });

    expect(tx.productVariantGroup.deleteMany).toHaveBeenCalledWith({
      where: { productId: otherId },
    });
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: otherId },
        data: expect.objectContaining({
          variantGroups: expect.objectContaining({ create: expect.any(Array) }),
        }),
      }),
    );
  });

  it("deletes the previous image when it changes", async () => {
    const { storage } = await import("./storage");
    const tx = {
      product: {
        update: vi.fn().mockResolvedValue({ id: otherId, image: "https://cdn.test/new.png" }),
      },
      productVariantGroup: { deleteMany: vi.fn() },
    };
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
      image: "https://cdn.test/old.png",
    });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue({
      id: "media-1",
      key: "tenants/tenant-1/old.png",
    });
    vi.mocked(prismaAny.media.delete).mockResolvedValue({ id: "media-1" });

    await updateProductHandler({
      data: { id: otherId, data: { image: "https://cdn.test/new.png" } },
      context: tenantContext,
    });

    expect(storage.deleteObject).toHaveBeenCalledWith("tenants/tenant-1/old.png");
  });

  it("keeps the existing image when update payload leaves it unchanged", async () => {
    const { storage } = await import("./storage");
    const tx = {
      product: {
        update: vi.fn().mockResolvedValue({ id: otherId, image: "https://cdn.test/old.png" }),
      },
      productVariantGroup: { deleteMany: vi.fn() },
    };
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
      image: "https://cdn.test/old.png",
    });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await updateProductHandler({
      data: { id: otherId, data: { name: "Produk Baru" } },
      context: tenantContext,
    });

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("propagates transaction failure so variant replacement rolls back", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({ id: otherId, tenantId: "tenant-1" });
    vi.mocked(prismaAny.$transaction).mockRejectedValue(new Error("db failed"));

    await expect(
      updateProductHandler({
        data: { id: otherId, data: { variantGroups: [] } },
        context: tenantContext,
      }),
    ).rejects.toThrow("db failed");
  });
});

describe("reorder product", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists product sortOrder for tenant-owned products", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    vi.mocked(prismaAny.product.findMany).mockResolvedValue(ids.map((id) => ({ id })));
    vi.mocked(prismaAny.product.update).mockResolvedValue({});
    vi.mocked(prismaAny.$transaction).mockImplementation(async (queries: any[]) =>
      Promise.all(queries),
    );

    await expect(reorderProductHandler({ data: ids, context: tenantContext })).resolves.toEqual({
      success: true,
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", id: { in: ids } },
      select: { id: true },
    });
    expect(prisma.product.update).toHaveBeenNthCalledWith(1, {
      where: { id: ids[0] },
      data: { sortOrder: 0 },
    });
    expect(prisma.product.update).toHaveBeenNthCalledWith(2, {
      where: { id: ids[1] },
      data: { sortOrder: 1 },
    });
  });

  it("rejects reorder when some products are not tenant-owned", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    vi.mocked(prismaAny.product.findMany).mockResolvedValue([{ id: ids[0] }]);

    await expect(reorderProductHandler({ data: ids, context: tenantContext })).rejects.toThrow(
      "Produk tidak ditemukan atau bukan milik toko Anda",
    );
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

describe("getProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns products with variant groups ordered by sortOrder", async () => {
    const mockProducts = [
      {
        id: "p1",
        name: "Kopi",
        basePrice: 25000,
        sortOrder: 0,
        variantGroups: [
          {
            id: "vg1",
            name: "Ukuran",
            sortOrder: 0,
            options: [{ id: "o1", name: "Large", priceDelta: 5000, sortOrder: 0 }],
          },
        ],
      },
    ];
    vi.mocked(prismaAny.product.findMany).mockResolvedValue(mockProducts);

    const result = await getProductsHandler({ data: "tenant-1" });

    expect(result).toEqual(mockProducts);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      orderBy: { sortOrder: "asc" },
      include: {
        variantGroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
  });

  it("returns empty array for tenant with no products", async () => {
    vi.mocked(prismaAny.product.findMany).mockResolvedValue([]);

    const result = await getProductsHandler({ data: "tenant-empty" });

    expect(result).toEqual([]);
  });
});

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws without tenant context", async () => {
    await expect(
      createProductHandler({
        data: { name: "Kopi", basePrice: 25000 },
        context: noTenantContext,
      }),
    ).rejects.toThrow("Toko tidak ditemukan untuk pengguna ini");
  });

  it("creates product with next sort order and no variant groups", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({ sortOrder: 2 });
    vi.mocked(prismaAny.product.create).mockResolvedValue({
      id: "new-prod",
      name: "Kopi Susu",
      basePrice: 18000,
      sortOrder: 3,
      variantGroups: [],
    });

    const result = await createProductHandler({
      data: { name: "Kopi Susu", basePrice: 18000 },
      context: tenantContext,
    });

    expect(result).toMatchObject({ name: "Kopi Susu", sortOrder: 3 });
    expect(prisma.product.create).toHaveBeenCalled();
    const callData = vi.mocked(prisma.product.create).mock.calls[0][0];
    expect(callData).toMatchObject({
      data: {
        name: "Kopi Susu",
        basePrice: 18000,
        sortOrder: 3,
        tenantId: "tenant-1",
      },
    });
  });

  it("creates product with variants when provided", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue(null);
    vi.mocked(prismaAny.product.create).mockResolvedValue({
      id: "new-prod",
      name: "Kopi",
      basePrice: 25000,
      sortOrder: 0,
      variantGroups: [
        {
          id: "vg1",
          name: "Ukuran",
          options: [{ id: "o1", name: "Large", priceDelta: 5000 }],
        },
      ],
    });

    const result = await createProductHandler({
      data: {
        name: "Kopi",
        basePrice: 25000,
        variantGroups: [{ name: "Ukuran", options: [{ name: "Large", priceDelta: 5000 }] }],
      },
      context: tenantContext,
    });

    expect(result).toMatchObject({ name: "Kopi", sortOrder: 0 });
    expect(prisma.product.create).toHaveBeenCalled();
    const callData = vi.mocked(prisma.product.create).mock.calls[0][0];
    expect(callData).toMatchObject({
      data: {
        variantGroups: {
          create: [
            {
              name: "Ukuran",
              options: {
                create: [{ name: "Large", priceDelta: 5000 }],
              },
            },
          ],
        },
      },
    });
  });

  it("starts sort order at 0 when no existing products", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue(null);
    vi.mocked(prismaAny.product.create).mockResolvedValue({
      id: "new-prod",
      name: "First Product",
      basePrice: 10000,
      sortOrder: 0,
      variantGroups: [],
    });

    await createProductHandler({
      data: { name: "First Product", basePrice: 10000 },
      context: tenantContext,
    });

    expect(prisma.product.create).toHaveBeenCalled();
    const callData = vi.mocked(prisma.product.create).mock.calls[0][0];
    expect(callData).toMatchObject({
      data: { sortOrder: 0 },
    });
  });

  it("rejects create when categoryId belongs to another tenant", async () => {
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue(null);

    await expect(
      createProductHandler({
        data: { name: "Kopi", basePrice: 15000, categoryId: otherId },
        context: tenantContext,
      }),
    ).rejects.toThrow("Kategori tidak ditemukan atau bukan milik toko Anda");
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it("rejects update when categoryId belongs to another tenant", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue({ id: otherId, tenantId: "tenant-1" });
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue(null);

    await expect(
      updateProductHandler({
        data: { id: otherId, data: { categoryId: otherId } },
        context: tenantContext,
      }),
    ).rejects.toThrow("Kategori tidak ditemukan atau bukan milik toko Anda");
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("creates product with stock tracking fields", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue(null);
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
    });
    vi.mocked(prismaAny.product.create).mockResolvedValue({
      id: "new-prod",
      name: "Kopi",
      basePrice: 15000,
      sortOrder: 0,
      trackStock: true,
      stock: 5,
      categoryId: otherId,
      variantGroups: [],
    });

    await createProductHandler({
      data: { name: "Kopi", basePrice: 15000, trackStock: true, stock: 5, categoryId: otherId },
      context: tenantContext,
    });

    const callData = vi.mocked(prisma.product.create).mock.calls[0][0];
    expect(callData).toMatchObject({
      data: { trackStock: true, stock: 5, categoryId: otherId },
    });
  });
});
