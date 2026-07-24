import { prisma } from "../db";

export const tenantIdentitySelect = {
  slug: true,
  name: true,
  tagline: true,
  avatar: true,
  whatsapp: true,
  whatsappTemplate: true,
  originName: true,
  originPhone: true,
  originAddress: true,
  originProvince: true,
  originCity: true,
  originDistrict: true,
  originPostalCode: true,
  rajaOngkirOriginId: true,
  rajaOngkirOriginLabel: true,
  allowedCouriers: true,
} as const;

export const linksOrderBy = { sortOrder: "asc" } as const;
export const productsOrderBy = { sortOrder: "asc" } as const;
export const variantGroupsOrderBy = { sortOrder: "asc" } as const;
export const variantOptionsOrderBy = { sortOrder: "asc" } as const;

export const productVariantInclude = {
  variantGroups: {
    orderBy: variantGroupsOrderBy,
    include: {
      options: {
        orderBy: variantOptionsOrderBy,
      },
    },
  },
} as const;

export const tenantProductInclude = {
  products: {
    orderBy: productsOrderBy,
    include: productVariantInclude,
  },
} as const;

export const tenantLinkInclude = {
  links: {
    orderBy: linksOrderBy,
  },
} as const;

export const tenantCatalogInclude = {
  ...tenantLinkInclude,
  ...tenantProductInclude,
} as const;

export const checkoutProductsInclude = {
  products: {
    include: {
      variantGroups: {
        include: { options: true },
      },
    },
  },
} as const;

export function withEmptyCatalog<T extends object>(tenant: T | null) {
  return tenant ? { ...tenant, links: [], products: [] } : null;
}

export function getStorefrontCatalogBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: tenantCatalogInclude,
  });
}

export function getCheckoutCatalogBySlug(slug: string, productIds: string[]) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      products: {
        where: { id: { in: productIds } },
        include: checkoutProductsInclude.products.include,
      },
    },
  });
}

export function getShippingCatalogBySlug(slug: string, productIds: string[]) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { products: { where: { id: { in: productIds } } } },
  });
}

export function getOgTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      products: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export function listSitemapTenants() {
  return prisma.tenant.findMany({
    select: {
      slug: true,
      updatedAt: true,
    },
  });
}
