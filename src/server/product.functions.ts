import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createProductSchema, updateProductSchema } from "../lib/schemas";
import { deleteTenantMediaByUrl } from "./media-cleanup";
import { clearStorefrontCatalogCache, productVariantInclude } from "./catalog.queries.server";
import { requireOwnedRecord, requireTenant } from "./tenant-context.server";
import { z } from "zod";

export const getProducts = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: tenantId }) => {
    return await prisma.product.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
      include: productVariantInclude,
    });
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createProductSchema)
  .handler(async ({ data, context }) => {
    const tenantId = requireTenant(context);

    const maxProduct = await prisma.product.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
    });
    const nextSortOrder = maxProduct ? maxProduct.sortOrder + 1 : 0;

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || "",
        basePrice: data.basePrice,
        image: data.image || "",
        sortOrder: nextSortOrder,
        tenantId,
        variantGroups: {
          create: data.variantGroups?.map((group, groupIdx) => ({
            name: group.name,
            sortOrder: groupIdx,
            options: {
              create: group.options.map((opt, optIdx) => ({
                name: opt.name,
                priceDelta: opt.priceDelta,
                sortOrder: optIdx,
              })),
            },
          })),
        },
      },
      include: {
        variantGroups: {
          include: {
            options: true,
          },
        },
      },
    });

    clearStorefrontCatalogCache(context.tenant?.slug);
    return product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      data: updateProductSchema,
    }),
  )
  .handler(async ({ data: { id, data }, context }) => {
    const tenantId = requireTenant(context);

    const existingProduct = (await requireOwnedRecord(prisma, "product", id, tenantId)) as {
      image: string;
    };

    const shouldDeleteOldImage = data.image !== undefined && data.image !== existingProduct.image;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (data.variantGroups !== undefined) {
        await tx.productVariantGroup.deleteMany({
          where: { productId: id },
        });
      }

      return await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          image: data.image,
          variantGroups: data.variantGroups
            ? {
                create: data.variantGroups.map((group, groupIdx) => ({
                  name: group.name,
                  sortOrder: groupIdx,
                  options: {
                    create: group.options.map((opt, optIdx) => ({
                      name: opt.name,
                      priceDelta: opt.priceDelta,
                      sortOrder: optIdx,
                    })),
                  },
                })),
              }
            : undefined,
        },
        include: productVariantInclude,
      });
    });

    clearStorefrontCatalogCache(context.tenant?.slug);

    if (shouldDeleteOldImage) {
      await deleteTenantMediaByUrl(tenantId, existingProduct.image);
    }

    return updatedProduct;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().uuid())
  .handler(async ({ data: id, context }) => {
    const tenantId = requireTenant(context);

    const existingProduct = (await requireOwnedRecord(prisma, "product", id, tenantId)) as {
      image: string;
    };

    await prisma.product.delete({
      where: { id },
    });

    clearStorefrontCatalogCache(context.tenant?.slug);
    await deleteTenantMediaByUrl(tenantId, existingProduct.image);

    return { success: true };
  });

export const reorderProducts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.array(z.string().uuid()).min(1, "Urutan produk tidak boleh kosong"))
  .handler(async ({ data: ids, context }) => {
    const tenantId = requireTenant(context);

    const products = await prisma.product.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });
    if (products.length !== ids.length) {
      throw new Error("Produk tidak ditemukan atau bukan milik toko Anda");
    }

    await prisma.$transaction(
      ids.map((id, sortOrder) =>
        prisma.product.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    clearStorefrontCatalogCache(context.tenant?.slug);
    return { success: true };
  });
