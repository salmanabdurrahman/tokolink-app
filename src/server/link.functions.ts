import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createLinkSchema, updateLinkSchema } from "../lib/schemas";
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
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

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
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

    const existingLink = await prisma.link.findFirst({
      where: { id, tenantId },
    });
    if (!existingLink) {
      throw new Error("Unauthorized: Link not found or does not belong to your store");
    }

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
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

    const existingLink = await prisma.link.findFirst({
      where: { id, tenantId },
    });
    if (!existingLink) {
      throw new Error("Unauthorized: Link not found or does not belong to your store");
    }

    await prisma.link.delete({
      where: { id },
    });

    return { success: true };
  });
