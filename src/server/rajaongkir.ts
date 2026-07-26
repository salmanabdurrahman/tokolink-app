type RajaOngkirConfig = {
  apiKey: string;
  baseUrl: string;
};

export type RajaOngkirDestination = {
  id: string;
  label: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  zipCode: string;
};

export type RajaOngkirCostOption = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export type RajaOngkirWaybill = {
  courier: string;
  trackingNumber: string;
  status: string;
  delivered: boolean;
  raw: unknown;
};

export type RajaOngkirLocation = {
  id: string;
  name: string;
  zipCode: string;
};

const DEFAULT_BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const REQUEST_TIMEOUT_MS = 10000;

function getConfig(): RajaOngkirConfig {
  const apiKey = process.env.RAJAONGKIR_API_KEY || "";
  const baseUrl = (process.env.RAJAONGKIR_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("Konfigurasi RajaOngkir belum lengkap");
  }

  return { apiKey, baseUrl };
}

function rajaOngkirErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return "Kunci API RajaOngkir tidak valid. Hubungi admin toko.";
  }
  if (status === 404) {
    return "Data RajaOngkir tidak ditemukan. Coba kata kunci lokasi lain.";
  }
  if (status === 429) {
    return "Terlalu banyak request ke RajaOngkir. Tunggu sebentar lalu coba lagi.";
  }
  if (status >= 500) {
    return "Layanan RajaOngkir sedang bermasalah. Coba lagi beberapa saat lagi.";
  }
  return "Gagal menghubungi RajaOngkir. Coba lagi.";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const { apiKey } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: { key: apiKey, ...(init?.headers || {}) },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(rajaOngkirErrorMessage(response.status));
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(RAJAONGKIR_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function payloadData(payload: any) {
  return payload?.data || payload?.rajaongkir?.results || payload?.results || [];
}

function normalizeDestination(item: any): RajaOngkirDestination {
  const provinceName = item.province_name || item.province || "";
  const cityName = item.city_name || item.city || item.regency_name || "";
  const districtName = item.district_name || item.district || "";
  const subdistrictName = item.subdistrict_name || item.subdistrict || item.village_name || "";
  const zipCode = String(item.zip_code || item.postal_code || "");
  const label =
    item.label ||
    [subdistrictName, districtName, cityName, provinceName, zipCode].filter(Boolean).join(", ");

  return {
    id: String(item.id || item.subdistrict_id || item.destination_id || item.city_id || ""),
    label,
    provinceName,
    cityName,
    districtName,
    subdistrictName,
    zipCode,
  };
}

function normalizeLocation(item: any): RajaOngkirLocation {
  return {
    id: String(item.id ?? ""),
    name: String(item.name || item.province_name || item.city_name || "").trim(),
    zipCode: String(item.zip_code || item.postal_code || ""),
  };
}

function normalizeCost(item: any): RajaOngkirCostOption {
  return {
    courier: String(item.code || item.courier || item.name || "").toLowerCase(),
    service: String(item.service || ""),
    description: String(item.description || item.name || item.service || ""),
    cost: Number(item.cost || item.value || item.price || 0),
    etd: String(item.etd || item.estimate || item.duration || ""),
  };
}

export async function searchDomesticDestination(search: string, limit = 5) {
  const { baseUrl } = getConfig();
  const url = new URL(`${baseUrl}/destination/domestic-destination`);
  url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");

  const payload = await fetchJson<any>(url.toString());
  return payloadData(payload)
    .map(normalizeDestination)
    .filter((item: RajaOngkirDestination) => item.id);
}

// Step-by-step hierarchy for the cascading location picker (provinsi ->
// kabupaten/kota -> kecamatan -> kelurahan). Each level narrows by the
// parent id returned from the level above.
export async function listProvinces() {
  const { baseUrl } = getConfig();
  const payload = await fetchJson<any>(`${baseUrl}/destination/province`);
  return payloadData(payload)
    .map(normalizeLocation)
    .filter((item: RajaOngkirLocation) => item.id && item.name);
}

export async function listCities(provinceId: string) {
  const { baseUrl } = getConfig();
  const payload = await fetchJson<any>(
    `${baseUrl}/destination/city/${encodeURIComponent(provinceId)}`,
  );
  return payloadData(payload)
    .map(normalizeLocation)
    .filter((item: RajaOngkirLocation) => item.id && item.name);
}

export async function listDistricts(cityId: string) {
  const { baseUrl } = getConfig();
  const payload = await fetchJson<any>(
    `${baseUrl}/destination/district/${encodeURIComponent(cityId)}`,
  );
  return payloadData(payload)
    .map(normalizeLocation)
    .filter((item: RajaOngkirLocation) => item.id && item.name);
}

export async function listSubdistricts(districtId: string) {
  const { baseUrl } = getConfig();
  const payload = await fetchJson<any>(
    `${baseUrl}/destination/sub-district/${encodeURIComponent(districtId)}`,
  );
  return payloadData(payload)
    .map(normalizeLocation)
    .filter((item: RajaOngkirLocation) => item.id && item.name);
}

const RAJAONGKIR_TIMEOUT_MESSAGE = "RajaOngkir terlalu lama merespons. Coba lagi.";
// Short TTL only reduces duplicate calls within one checkout session (pilih
// tujuan -> revalidate checkout); it must not serve rates stale enough to
// diverge from what RajaOngkir would quote on a fresh request.
const COST_CACHE_TTL_MS = 60 * 1000;
const COST_CACHE_MAX_ENTRIES = 300;
const MAX_COST_RETRIES = 1;

const costCache = new Map<
  string,
  { expiresAt: number; promise: Promise<RajaOngkirCostOption[]> }
>();

function pruneCostCache() {
  const now = Date.now();
  for (const [key, entry] of costCache) {
    if (entry.expiresAt <= now) costCache.delete(key);
  }

  if (costCache.size >= COST_CACHE_MAX_ENTRIES) {
    const oldestKey = costCache.keys().next().value;
    if (oldestKey) costCache.delete(oldestKey);
  }
}

export function __clearRajaOngkirCostCacheForTests() {
  costCache.clear();
}

async function requestDomesticCost(input: {
  origin: string;
  destination: string;
  weight: number;
  couriers: string[];
}): Promise<RajaOngkirCostOption[]> {
  const { baseUrl } = getConfig();
  const body = new URLSearchParams();
  body.set("origin", input.origin);
  body.set("destination", input.destination);
  body.set("weight", String(Math.max(1, Math.ceil(input.weight))));
  body.set("courier", input.couriers.join(":"));
  body.set("price", "lowest");

  const payload = await fetchJson<any>(`${baseUrl}/calculate/domestic-cost`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return payloadData(payload)
    .map(normalizeCost)
    .filter((item: RajaOngkirCostOption) => item.courier && item.service);
}

async function requestDomesticCostWithRetry(
  input: { origin: string; destination: string; weight: number; couriers: string[] },
  attempt = 0,
): Promise<RajaOngkirCostOption[]> {
  try {
    return await requestDomesticCost(input);
  } catch (error) {
    const isTimeout = error instanceof Error && error.message === RAJAONGKIR_TIMEOUT_MESSAGE;
    if (isTimeout && attempt < MAX_COST_RETRIES) {
      return requestDomesticCostWithRetry(input, attempt + 1);
    }
    throw error;
  }
}

export async function calculateDomesticCost(input: {
  origin: string;
  destination: string;
  weight: number;
  couriers: string[];
}) {
  pruneCostCache();
  const cacheKey = `${input.origin}:${input.destination}:${Math.max(1, Math.ceil(input.weight))}:${[...input.couriers].sort().join(",")}`;
  const cached = costCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = requestDomesticCostWithRetry(input);
  costCache.set(cacheKey, { expiresAt: Date.now() + COST_CACHE_TTL_MS, promise });
  promise.catch(() => costCache.delete(cacheKey));
  return promise;
}

export async function trackWaybill(courier: string, trackingNumber: string) {
  const { baseUrl } = getConfig();
  const body = new URLSearchParams();
  body.set("courier", courier);
  body.set("waybill", trackingNumber);

  const payload = await fetchJson<any>(`${baseUrl}/track/waybill`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = payload?.data || payload;

  return {
    courier,
    trackingNumber,
    status: String(data?.summary?.status || data?.status || ""),
    delivered: Boolean(data?.summary?.delivered || data?.delivered),
    raw: payload,
  } satisfies RajaOngkirWaybill;
}
