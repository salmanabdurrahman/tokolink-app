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
      throw new Error("RajaOngkir terlalu lama merespons. Coba lagi.");
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

export async function calculateDomesticCost(input: {
  origin: string;
  destination: string;
  weight: number;
  couriers: string[];
}) {
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
