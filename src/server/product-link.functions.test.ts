import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    product: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
    productVariantGroup: { deleteMany: vi.fn() },
    link: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (callback) =>
      callback({
        product: { update: vi.fn() },
        productVariantGroup: { deleteMany: vi.fn() },
      }),
    ),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));

import { prisma } from "../db";
import { addLink, deleteLink, updateLink } from "./link.functions";
import { deleteProduct, updateProduct } from "./product.functions";

const prismaAny = prisma as any;
const addLinkHandler = addLink as any;
const updateProductHandler = updateProduct as any;
const deleteProductHandler = deleteProduct as any;
const updateLinkHandler = updateLink as any;
const deleteLinkHandler = deleteLink as any;

const tenantContext = { tenant: { id: "tenant-1" } };
const noTenantContext = { user: { id: "user-1" } };
const otherId = "11111111-1111-4111-8111-111111111111";

describe("product/link ownership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects product update/delete when product belongs to another tenant", async () => {
    vi.mocked(prismaAny.product.findFirst).mockResolvedValue(null);

    await expect(
      updateProductHandler({
        data: { id: otherId, data: { name: "Produk" } },
        context: tenantContext,
      }),
    ).rejects.toThrow("Unauthorized: Product not found or does not belong to your store");

    await expect(deleteProductHandler({ data: otherId, context: tenantContext })).rejects.toThrow(
      "Unauthorized: Product not found or does not belong to your store",
    );
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it("rejects link update/delete when link belongs to another tenant", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue(null);

    await expect(
      updateLinkHandler({ data: { id: otherId, data: { label: "IG" } }, context: tenantContext }),
    ).rejects.toThrow("Unauthorized: Link not found or does not belong to your store");

    await expect(deleteLinkHandler({ data: otherId, context: tenantContext })).rejects.toThrow(
      "Unauthorized: Link not found or does not belong to your store",
    );
    expect(prisma.link.update).not.toHaveBeenCalled();
    expect(prisma.link.delete).not.toHaveBeenCalled();
  });
});

describe("product update transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

describe("addLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws without tenant context", async () => {
    await expect(
      addLinkHandler({
        data: { label: "Instagram", url: "https://instagram.com/test" },
        context: noTenantContext,
      }),
    ).rejects.toThrow("No tenant found for this user");
  });

  it("creates link with next sort order", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue({ sortOrder: 5 });
    vi.mocked(prismaAny.link.create).mockResolvedValue({
      id: "link-1",
      label: "Instagram",
      url: "https://instagram.com/test",
      icon: "instagram",
      sortOrder: 6,
      tenantId: "tenant-1",
    });

    const result = await addLinkHandler({
      data: { label: "Instagram", url: "https://instagram.com/test", icon: "instagram" },
      context: tenantContext,
    });

    expect(result).toMatchObject({ label: "Instagram", sortOrder: 6 });
    expect(prisma.link.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        label: "Instagram",
        url: "https://instagram.com/test",
        sortOrder: 6,
        tenantId: "tenant-1",
      }),
    });
  });

  it("starts sort order at 0 when no existing links", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue(null);
    vi.mocked(prismaAny.link.create).mockResolvedValue({
      id: "link-1",
      label: "First",
      url: "https://example.com",
      icon: null,
      sortOrder: 0,
      tenantId: "tenant-1",
    });

    await addLinkHandler({
      data: { label: "First", url: "https://example.com" },
      context: tenantContext,
    });

    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 0 }),
      }),
    );
  });
});
