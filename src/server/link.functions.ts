import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createLinkSchema, updateLinkSchema } from "../lib/schemas";
import { requireOwnedRecord, requireTenant } from "./tenant-context.server";
import { z } from "zod";

export const getLinks = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: tenantId }) => {
    return await prisma.link.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  });

export const addLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createLinkSchema)
  .handler(async ({ data, context }) => {
    const tenantId = requireTenant(context);

    const maxLink = await prisma.link.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
    });
    const nextSortOrder = maxLink ? maxLink.sortOrder + 1 : 0;

    const link = await prisma.link.create({
      data: {
        label: data.label,
        url: data.url,
        icon: data.icon || null,
        sortOrder: nextSortOrder,
        tenantId,
      },
    });

    return link;
  });

export const updateLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      data: updateLinkSchema,
    }),
  )
  .handler(async ({ data: { id, data }, context }) => {
    const tenantId = requireTenant(context);

    await requireOwnedRecord(prisma, "link", id, tenantId);

    const updatedLink = await prisma.link.update({
      where: { id },
      data: {
        label: data.label,
        url: data.url,
        icon: data.icon,
      },
    });

    return updatedLink;
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().uuid())
  .handler(async ({ data: id, context }) => {
    const tenantId = requireTenant(context);

    await requireOwnedRecord(prisma, "link", id, tenantId);

    await prisma.link.delete({
      where: { id },
    });

    return { success: true };
  });

export const reorderLinks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.array(z.string().uuid()).min(1, "Urutan tautan tidak boleh kosong"))
  .handler(async ({ data: ids, context }) => {
    const tenantId = requireTenant(context);

    const links = await prisma.link.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });
    if (links.length !== ids.length) {
      throw new Error("Tautan tidak ditemukan atau bukan milik toko Anda");
    }

    await prisma.$transaction(
      ids.map((id, sortOrder) =>
        prisma.link.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    return { success: true };
  });
