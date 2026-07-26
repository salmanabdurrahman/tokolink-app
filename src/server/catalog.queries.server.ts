import { prisma } from "../db";
import { recordMetric } from "../lib/metrics.server";

const STOREFRONT_CATALOG_CACHE_TTL_MS = 60 * 1000;
const STOREFRONT_CATALOG_CACHE_MAX_ENTRIES = 500;

type StorefrontCatalog = Awaited<ReturnType<typeof loadStorefrontCatalogBySlug>>;
type StorefrontCatalogCacheEntry = {
  expiresAt: number;
  promise: Promise<StorefrontCatalog>;
};

const storefrontCatalogCache = new Map<string, StorefrontCatalogCacheEntry>();

function pruneStorefrontCatalogCache() {
  const now = Date.now();
  for (const [slug, entry] of storefrontCatalogCache) {
    if (entry.expiresAt <= now) storefrontCatalogCache.delete(slug);
  }

  if (storefrontCatalogCache.size >= STOREFRONT_CATALOG_CACHE_MAX_ENTRIES) {
    const oldestSlug = storefrontCatalogCache.keys().next().value;
    if (oldestSlug) storefrontCatalogCache.delete(oldestSlug);
  }
}

export function clearStorefrontCatalogCache(slug?: string) {
  if (slug) {
    storefrontCatalogCache.delete(slug);
    return;
  }

  storefrontCatalogCache.clear();
}

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

// Slim identity fields for dashboard shell chrome (sidebar/header/overview),
// which only render `slug`/`name`/`whatsapp`. Avoids pulling origin/shipping
// columns on the loader that fires on every dashboard navigation.
export const tenantDashboardShellSelect = {
  slug: true,
  name: true,
  whatsapp: true,
} as const;

// Identity fields needed by product/link management pages: display identity
// without RajaOngkir origin/shipping columns, which those pages never read.
export const tenantCatalogIdentitySelect = {
  slug: true,
  name: true,
  tagline: true,
  avatar: true,
  whatsapp: true,
  whatsappTemplate: true,
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

function loadStorefrontCatalogBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: tenantCatalogInclude,
  });
}

export function getStorefrontCatalogBySlug(slug: string) {
  pruneStorefrontCatalogCache();

  const cached = storefrontCatalogCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    recordMetric("storefront_cache_hit", { slug });
    return cached.promise;
  }
  recordMetric("storefront_cache_miss", { slug });

  const promise = loadStorefrontCatalogBySlug(slug)
    .then((tenant) => {
      if (!tenant) storefrontCatalogCache.delete(slug);
      return tenant;
    })
    .catch((error) => {
      storefrontCatalogCache.delete(slug);
      throw error;
    });
  storefrontCatalogCache.set(slug, {
    expiresAt: Date.now() + STOREFRONT_CATALOG_CACHE_TTL_MS,
    promise,
  });

  return promise;
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
