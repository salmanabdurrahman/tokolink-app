import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createTenantSchema, updateTenantSchema } from "../lib/schemas";
import { enforceAuthRateLimit, logAuthAbuse } from "./auth-abuse";
import { deleteTenantMediaByUrl } from "./media-cleanup";
import {
  getStorefrontCatalogBySlug,
  tenantCatalogInclude,
  tenantIdentitySelect,
  tenantLinkInclude,
  tenantProductInclude,
  withEmptyCatalog,
} from "./catalog.queries.server";
import { requireTenant } from "./tenant-context.server";
import { z } from "zod";

export const getTenant = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data: slug }) => {
    const tenant = await getStorefrontCatalogBySlug(slug);

    if (!tenant) {
      throw new Error(`Toko dengan slug "${slug}" tidak ditemukan`);
    }

    return tenant;
  });

export const getMyTenant = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: tenantCatalogInclude,
    });

    return tenant;
  });

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const tenantId = context.tenant?.id;

    const [tenant, orderCount, productCount, linkCount] = await Promise.all([
      prisma.tenant.findUnique({
        where: { userId },
        select: tenantIdentitySelect,
      }),
      tenantId ? prisma.order.count({ where: { tenantId, status: "PAID" } }) : Promise.resolve(0),
      tenantId ? prisma.product.count({ where: { tenantId } }) : Promise.resolve(0),
      tenantId ? prisma.link.count({ where: { tenantId } }) : Promise.resolve(0),
    ]);

    return { tenant: withEmptyCatalog(tenant), orderCount, productCount, linkCount };
  });

export const getMyTenantProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      select: {
        ...tenantIdentitySelect,
        ...tenantProductInclude,
      },
    });

    return tenant ? { ...tenant, links: [] } : null;
  });

export const getMyTenantLinks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      select: {
        ...tenantIdentitySelect,
        ...tenantLinkInclude,
      },
    });

    return tenant ? { ...tenant, products: [] } : null;
  });

export const getMyTenantSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      select: tenantIdentitySelect,
    });

    return withEmptyCatalog(tenant);
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createTenantSchema)
  .handler(async ({ data, context, request }: any) => {
    const userId = context.user.id;

    await enforceAuthRateLimit({ event: "onboarding", userId, request });

    const existingUserTenant = await prisma.tenant.findUnique({
      where: { userId },
    });
    if (existingUserTenant) {
      throw new Error("Anda sudah memiliki toko");
    }

    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new Error("Domain/slug toko ini sudah digunakan");
    }

    const tenant = await prisma.tenant.create({
      data: {
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || "",
        avatar:
          data.avatar ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=D4FF3A&textColor=0A0A0A`,
        whatsapp: data.whatsapp || "",
        userId,
      },
    });

    await logAuthAbuse({ event: "onboarding", userId, request, outcome: "success" });

    return tenant;
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateTenantSchema)
  .handler(async ({ data, context }) => {
    const tenantId = requireTenant(context);

    if (data.slug && data.slug !== context.tenant?.slug) {
      const existingSlug = await prisma.tenant.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new Error("Domain/slug toko ini sudah digunakan");
      }
    }

    const oldAvatar = context.tenant?.avatar;
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    if (data.avatar !== undefined && data.avatar !== oldAvatar) {
      await deleteTenantMediaByUrl(tenantId, oldAvatar);
    }

    return tenant;
  });
