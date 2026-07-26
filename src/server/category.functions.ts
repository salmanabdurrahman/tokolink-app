import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createCategorySchema, updateCategorySchema } from "../lib/schemas";
import { clearStorefrontCatalogCache } from "./catalog.queries.server";
import { requireOwnedRecord, requireTenant } from "./tenant-context.server";
import { z } from "zod";

export const getCategories = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: tenantId }) => {
    return await prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  });

export const addCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createCategorySchema)
  .handler(async ({ data, context }) => {
    const tenantId = requireTenant(context);

    const maxCategory = await prisma.productCategory.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
    });
    const nextSortOrder = maxCategory ? maxCategory.sortOrder + 1 : 0;

    const category = await prisma.productCategory.create({
      data: {
        name: data.name,
        sortOrder: nextSortOrder,
        tenantId,
      },
    });

    clearStorefrontCatalogCache(context.tenant?.slug);
    return category;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      data: updateCategorySchema,
    }),
  )
  .handler(async ({ data: { id, data }, context }) => {
    const tenantId = requireTenant(context);

    await requireOwnedRecord(prisma, "productCategory", id, tenantId);

    const updatedCategory = await prisma.productCategory.update({
      where: { id },
      data: {
        name: data.name,
      },
    });

    clearStorefrontCatalogCache(context.tenant?.slug);
    return updatedCategory;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().uuid())
  .handler(async ({ data: id, context }) => {
    const tenantId = requireTenant(context);

    await requireOwnedRecord(prisma, "productCategory", id, tenantId);

    await prisma.productCategory.delete({
      where: { id },
    });

    clearStorefrontCatalogCache(context.tenant?.slug);
    return { success: true };
  });

export const reorderCategories = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.array(z.string().uuid()).min(1, "Urutan kategori tidak boleh kosong"))
  .handler(async ({ data: ids, context }) => {
    const tenantId = requireTenant(context);

    const categories = await prisma.productCategory.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });
    if (categories.length !== ids.length) {
      throw new Error("Kategori tidak ditemukan atau bukan milik toko Anda");
    }

    await prisma.$transaction(
      ids.map((id, sortOrder) =>
        prisma.productCategory.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    clearStorefrontCatalogCache(context.tenant?.slug);
    return { success: true };
  });
