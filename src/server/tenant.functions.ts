import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createTenantSchema, updateTenantSchema } from "../lib/schemas";
import { z } from "zod";

export const getTenant = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data: slug }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        links: {
          orderBy: { sortOrder: "asc" },
        },
        products: {
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
        },
      },
    });

    if (!tenant) {
      throw new Error(`Tenant with slug "${slug}" not found`);
    }

    return tenant;
  });

export const getMyTenant = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: {
        links: {
          orderBy: { sortOrder: "asc" },
        },
        products: {
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
        },
      },
    });

    return tenant;
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createTenantSchema)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    if (data.recaptchaToken) {
      const { verifyRecaptcha } = await import("./recaptcha");
      const isValid = await verifyRecaptcha(data.recaptchaToken, "onboarding");
      if (!isValid) {
        throw new Error("Verifikasi reCAPTCHA gagal. Harap coba lagi.");
      }
    }

    const existingUserTenant = await prisma.tenant.findUnique({
      where: { userId },
    });
    if (existingUserTenant) {
      throw new Error("User already has an onboarding tenant");
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

    return tenant;
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateTenantSchema)
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

    if (data.slug && data.slug !== context.tenant?.slug) {
      const existingSlug = await prisma.tenant.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new Error("Domain/slug toko ini sudah digunakan");
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    return tenant;
  });
