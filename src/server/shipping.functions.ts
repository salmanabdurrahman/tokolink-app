import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  calculateDomesticCost,
  listCities,
  listDistricts,
  listProvinces,
  listSubdistricts,
  searchDomesticDestination,
  trackWaybill,
} from "./rajaongkir";
import { getShippingCatalogBySlug } from "./catalog.queries.server";
import { DEFAULT_COURIERS } from "../lib/commerce-policy";
const destinationCache = new Map<
  string,
  { expiresAt: number; data: Awaited<ReturnType<typeof searchDomesticDestination>> }
>();

// Reference geography (provinsi/kabupaten/kecamatan/kelurahan) barely ever
// changes, so a long TTL keeps the cascading picker snappy without hammering
// RajaOngkir on every keystroke-free dropdown open.
const LOCATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const locationCache = new Map<
  string,
  { expiresAt: number; data: Awaited<ReturnType<typeof listProvinces>> }
>();

async function cachedLocations(
  cacheKey: string,
  loader: () => Promise<Awaited<ReturnType<typeof listProvinces>>>,
) {
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const data = await loader();
  locationCache.set(cacheKey, { expiresAt: Date.now() + LOCATION_CACHE_TTL_MS, data });
  return data;
}

export function __clearRajaOngkirLocationCacheForTests() {
  locationCache.clear();
}

export const destinationSearchSchema = z.object({
  search: z.string().trim().min(3, "Ketik minimal 3 karakter lokasi"),
  limit: z.number().int().min(1).max(10).default(5),
});

export const locationParentSchema = z.object({
  parentId: z.string().trim().min(1, "Pilih lokasi sebelumnya dulu"),
});

export const shippingCostSchema = z.object({
  tenantSlug: z.string().min(3),
  destinationId: z.string().min(1, "Tujuan pengiriman harus dipilih"),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Keranjang masih kosong"),
});

export const waybillSchema = z.object({
  courier: z.string().min(2).max(40),
  trackingNumber: z.string().min(4).max(80),
});

export function calculateShippingWeightGram(items: { weightGram?: number | null; qty: number }[]) {
  const total = items.reduce((sum, item) => sum + Math.max(1, item.weightGram || 1) * item.qty, 0);
  return Math.max(1, total);
}

export const searchRajaOngkirDestinations = createServerFn({ method: "GET" })
  .validator(destinationSearchSchema)
  .handler(async ({ data }) => {
    const cacheKey = `${data.search.toLowerCase()}:${data.limit}`;
    const cached = destinationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const destinations = await searchDomesticDestination(data.search, data.limit);
    destinationCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, data: destinations });
    return destinations;
  });

export const getRajaOngkirProvinces = createServerFn({ method: "GET" }).handler(async () =>
  cachedLocations("province", () => listProvinces()),
);

export const getRajaOngkirCities = createServerFn({ method: "GET" })
  .validator(locationParentSchema)
  .handler(async ({ data }) =>
    cachedLocations(`city:${data.parentId}`, () => listCities(data.parentId)),
  );

export const getRajaOngkirDistricts = createServerFn({ method: "GET" })
  .validator(locationParentSchema)
  .handler(async ({ data }) =>
    cachedLocations(`district:${data.parentId}`, () => listDistricts(data.parentId)),
  );

export const getRajaOngkirSubdistricts = createServerFn({ method: "GET" })
  .validator(locationParentSchema)
  .handler(async ({ data }) =>
    cachedLocations(`subdistrict:${data.parentId}`, () => listSubdistricts(data.parentId)),
  );

export const getRajaOngkirShippingCosts = createServerFn({ method: "POST" })
  .validator(shippingCostSchema)
  .handler(async ({ data }) => {
    const tenant = await getShippingCatalogBySlug(
      data.tenantSlug,
      data.items.map((item) => item.productId),
    );

    if (!tenant) throw new Error("Toko tidak ditemukan");
    if (!tenant.rajaOngkirOriginId) {
      throw new Error("Toko belum mengatur origin pengiriman. Hubungi penjual.");
    }
    if (tenant.products.length !== new Set(data.items.map((item) => item.productId)).size) {
      throw new Error("Sebagian produk tidak ditemukan");
    }

    const products = new Map(tenant.products.map((product) => [product.id, product]));
    const weight = calculateShippingWeightGram(
      data.items.map((item) => ({
        weightGram: products.get(item.productId)?.weightGram,
        qty: item.qty,
      })),
    );
    const couriers = tenant.allowedCouriers.length ? tenant.allowedCouriers : [...DEFAULT_COURIERS];

    const costs = await calculateDomesticCost({
      origin: tenant.rajaOngkirOriginId,
      destination: data.destinationId,
      weight,
      couriers,
    });

    if (!costs.length) throw new Error("Layanan pengiriman untuk rute ini belum tersedia");
    return { weightGram: weight, options: costs };
  });

export const checkRajaOngkirWaybill = createServerFn({ method: "POST" })
  .validator(waybillSchema)
  .handler(async ({ data }) => trackWaybill(data.courier, data.trackingNumber));
