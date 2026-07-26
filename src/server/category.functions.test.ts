import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    productCategory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callbackOrQueries) => {
      if (Array.isArray(callbackOrQueries)) return Promise.all(callbackOrQueries);
      return callbackOrQueries({});
    }),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));

import { prisma } from "../db";
import {
  addCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from "./category.functions";

const prismaAny = prisma as any;
const addCategoryHandler = addCategory as any;
const getCategoriesHandler = getCategories as any;
const updateCategoryHandler = updateCategory as any;
const deleteCategoryHandler = deleteCategory as any;
const reorderCategoriesHandler = reorderCategories as any;

const tenantContext = { tenant: { id: "tenant-1" } };
const noTenantContext = { user: { id: "user-1" } };
const otherId = "11111111-1111-4111-8111-111111111111";

describe("category ownership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects category update/delete when category belongs to another tenant", async () => {
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue(null);

    await expect(
      updateCategoryHandler({
        data: { id: otherId, data: { name: "Kategori" } },
        context: tenantContext,
      }),
    ).rejects.toThrow("Kategori tidak ditemukan atau bukan milik toko Anda");

    await expect(deleteCategoryHandler({ data: otherId, context: tenantContext })).rejects.toThrow(
      "Kategori tidak ditemukan atau bukan milik toko Anda",
    );

    expect(prisma.productCategory.update).not.toHaveBeenCalled();
    expect(prisma.productCategory.delete).not.toHaveBeenCalled();
  });
});

describe("addCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws without tenant context", async () => {
    await expect(
      addCategoryHandler({ data: { name: "Minuman" }, context: noTenantContext }),
    ).rejects.toThrow("Toko tidak ditemukan untuk pengguna ini");
  });

  it("creates category with next sort order", async () => {
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue({ sortOrder: 1 });
    vi.mocked(prismaAny.productCategory.create).mockResolvedValue({
      id: "cat-1",
      name: "Minuman",
      sortOrder: 2,
    });

    const result = await addCategoryHandler({
      data: { name: "Minuman" },
      context: tenantContext,
    });

    expect(result).toMatchObject({ name: "Minuman", sortOrder: 2 });
    expect(prisma.productCategory.create).toHaveBeenCalledWith({
      data: { name: "Minuman", sortOrder: 2, tenantId: "tenant-1" },
    });
  });

  it("starts sort order at 0 when tenant has no categories", async () => {
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue(null);
    vi.mocked(prismaAny.productCategory.create).mockResolvedValue({
      id: "cat-1",
      name: "Merchandise",
      sortOrder: 0,
    });

    await addCategoryHandler({ data: { name: "Merchandise" }, context: tenantContext });

    expect(prisma.productCategory.create).toHaveBeenCalledWith({
      data: { name: "Merchandise", sortOrder: 0, tenantId: "tenant-1" },
    });
  });
});

describe("updateCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renames tenant-owned category", async () => {
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
    });
    vi.mocked(prismaAny.productCategory.update).mockResolvedValue({
      id: otherId,
      name: "Kategori Baru",
    });

    const result = await updateCategoryHandler({
      data: { id: otherId, data: { name: "Kategori Baru" } },
      context: tenantContext,
    });

    expect(result).toEqual({ id: otherId, name: "Kategori Baru" });
    expect(prisma.productCategory.update).toHaveBeenCalledWith({
      where: { id: otherId },
      data: { name: "Kategori Baru" },
    });
  });
});

describe("deleteCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes tenant-owned category", async () => {
    vi.mocked(prismaAny.productCategory.findFirst).mockResolvedValue({
      id: otherId,
      tenantId: "tenant-1",
    });
    vi.mocked(prismaAny.productCategory.delete).mockResolvedValue({ id: otherId });

    await expect(deleteCategoryHandler({ data: otherId, context: tenantContext })).resolves.toEqual(
      { success: true },
    );
    expect(prisma.productCategory.delete).toHaveBeenCalledWith({ where: { id: otherId } });
  });
});

describe("reorderCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists category sortOrder for tenant-owned categories", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    vi.mocked(prismaAny.productCategory.findMany).mockResolvedValue(ids.map((id) => ({ id })));
    vi.mocked(prismaAny.productCategory.update).mockResolvedValue({});
    vi.mocked(prismaAny.$transaction).mockImplementation(async (queries: any[]) =>
      Promise.all(queries),
    );

    await expect(reorderCategoriesHandler({ data: ids, context: tenantContext })).resolves.toEqual({
      success: true,
    });

    expect(prisma.productCategory.update).toHaveBeenNthCalledWith(1, {
      where: { id: ids[0] },
      data: { sortOrder: 0 },
    });
    expect(prisma.productCategory.update).toHaveBeenNthCalledWith(2, {
      where: { id: ids[1] },
      data: { sortOrder: 1 },
    });
  });

  it("rejects reorder when some categories are not tenant-owned", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    vi.mocked(prismaAny.productCategory.findMany).mockResolvedValue([{ id: ids[0] }]);

    await expect(reorderCategoriesHandler({ data: ids, context: tenantContext })).rejects.toThrow(
      "Kategori tidak ditemukan atau bukan milik toko Anda",
    );
    expect(prisma.productCategory.update).not.toHaveBeenCalled();
  });
});

describe("getCategories", () => {
  it("returns categories ordered by sortOrder", async () => {
    const mockCategories = [{ id: "cat-1", name: "Kopi", sortOrder: 0 }];
    vi.mocked(prismaAny.productCategory.findMany).mockResolvedValue(mockCategories);

    const result = await getCategoriesHandler({ data: "tenant-1" });

    expect(result).toEqual(mockCategories);
    expect(prisma.productCategory.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      orderBy: { sortOrder: "asc" },
    });
  });
});
