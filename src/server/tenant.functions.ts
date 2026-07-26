import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createTenantSchema, updateTenantSchema } from "../lib/schemas";
import { enforceAuthRateLimit, logAuthAbuse } from "./auth-abuse";
import { deleteTenantMediaByUrl } from "./media-cleanup";
import {
  clearStorefrontCatalogCache,
  getStorefrontCatalogBySlug,
  tenantCatalogIdentitySelect,
  tenantCatalogInclude,
  tenantCategoryInclude,
  tenantDashboardShellSelect,
  tenantIdentitySelect,
  tenantLinkInclude,
  tenantProductInclude,
  withEmptyCatalog,
} from "./catalog.queries.server";
import { requireTenant } from "./tenant-context.server";
import { invalidateCachedUser } from "./user-cache.server";
import { withTiming } from "../lib/metrics.server";
import { calculateAvailableBalance } from "./withdrawal.functions";
import { z } from "zod";

// Matches `INSIGHT_DAYS` in `sales-insight-card.tsx` so the sales delta shown
// on the overview matches the AI insight card's period.
const DASHBOARD_SALES_PERIOD_DAYS = 30;
const DASHBOARD_PAID_STATUSES = ["PAID", "SHIPPED", "COMPLETED"] as const;

export const getTenant = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data: slug }) =>
    withTiming("get_tenant", { slug }, async () => {
      const tenant = await getStorefrontCatalogBySlug(slug);

      if (!tenant) {
        throw new Error(`Toko dengan slug "${slug}" tidak ditemukan`);
      }

      return tenant;
    }),
  );

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
  .handler(async ({ context }) =>
    withTiming("get_dashboard_data", { queryCount: 8 }, async () => {
      const userId = context.user.id;
      const tenantId = context.tenant?.id;
      const now = new Date();
      const periodStart = new Date(
        now.getTime() - DASHBOARD_SALES_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      );
      const previousPeriodStart = new Date(
        now.getTime() - 2 * DASHBOARD_SALES_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      );

      const [
        tenant,
        orderCount,
        productCount,
        linkCount,
        pendingPaymentCount,
        completedOrderCount,
        currentSales,
        previousSales,
        availableBalance,
      ] = await Promise.all([
        prisma.tenant.findUnique({
          where: { userId },
          select: tenantDashboardShellSelect,
        }),
        tenantId ? prisma.order.count({ where: { tenantId, status: "PAID" } }) : Promise.resolve(0),
        tenantId ? prisma.product.count({ where: { tenantId } }) : Promise.resolve(0),
        tenantId ? prisma.link.count({ where: { tenantId } }) : Promise.resolve(0),
        tenantId
          ? prisma.order.count({ where: { tenantId, status: "PENDING_PAYMENT" } })
          : Promise.resolve(0),
        tenantId
          ? prisma.order.count({ where: { tenantId, status: "COMPLETED" } })
          : Promise.resolve(0),
        tenantId
          ? prisma.order.aggregate({
              where: {
                tenantId,
                status: { in: [...DASHBOARD_PAID_STATUSES] },
                paidAt: { gte: periodStart },
              },
              _sum: { subtotal: true },
            })
          : Promise.resolve({ _sum: { subtotal: null } }),
        tenantId
          ? prisma.order.aggregate({
              where: {
                tenantId,
                status: { in: [...DASHBOARD_PAID_STATUSES] },
                paidAt: { gte: previousPeriodStart, lt: periodStart },
              },
              _sum: { subtotal: true },
            })
          : Promise.resolve({ _sum: { subtotal: null } }),
        tenantId ? calculateAvailableBalance(prisma, tenantId, now) : Promise.resolve(0),
      ]);

      const currentSalesTotal = currentSales._sum.subtotal || 0;
      const previousSalesTotal = previousSales._sum.subtotal || 0;
      const salesDeltaPercent =
        previousSalesTotal > 0
          ? Math.round(((currentSalesTotal - previousSalesTotal) / previousSalesTotal) * 100)
          : null;

      return {
        tenant: withEmptyCatalog(tenant),
        orderCount,
        productCount,
        linkCount,
        pendingPaymentCount,
        completedOrderCount,
        salesTotal: currentSalesTotal,
        salesDeltaPercent,
        availableBalance,
      };
    }),
  );

export const getMyTenantProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    withTiming("get_my_tenant_products", { queryCount: 1 }, async () => {
      const userId = context.user.id;
      const tenant = await prisma.tenant.findUnique({
        where: { userId },
        select: {
          ...tenantCatalogIdentitySelect,
          ...tenantProductInclude,
          ...tenantCategoryInclude,
        },
      });

      return tenant ? { ...tenant, links: [] } : null;
    }),
  );

export const getMyTenantLinks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    withTiming("get_my_tenant_links", { queryCount: 1 }, async () => {
      const userId = context.user.id;
      const tenant = await prisma.tenant.findUnique({
        where: { userId },
        select: {
          ...tenantCatalogIdentitySelect,
          ...tenantLinkInclude,
        },
      });

      return tenant ? { ...tenant, products: [], categories: [] } : null;
    }),
  );

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

    clearStorefrontCatalogCache(tenant.slug);
    invalidateCachedUser(context.user.supabaseId);
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

    clearStorefrontCatalogCache(context.tenant?.slug);
    clearStorefrontCatalogCache(tenant.slug);
    invalidateCachedUser(context.user.supabaseId);

    if (data.avatar !== undefined && data.avatar !== oldAvatar) {
      await deleteTenantMediaByUrl(tenantId, oldAvatar);
    }

    return tenant;
  });
