type PakasirConfig = {
  projectSlug: string;
  apiKey: string;
  baseUrl: string;
};

export type PakasirPayment = {
  project: string;
  order_id: string;
  amount: number;
  fee?: number;
  total_payment?: number;
  payment_method?: string;
  payment_number?: string;
  expired_at?: string;
};

export type PakasirTransaction = {
  project: string;
  order_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  completed_at?: string;
};

const DEFAULT_BASE_URL = "https://app.pakasir.com";
const REQUEST_TIMEOUT_MS = 10000;

function getConfig(): PakasirConfig {
  const projectSlug = process.env.PAKASIR_PROJECT_SLUG || "";
  const apiKey = process.env.PAKASIR_API_KEY || "";
  const baseUrl = (process.env.PAKASIR_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  if (!projectSlug || !apiKey) {
    throw new Error("Konfigurasi Pakasir belum lengkap");
  }

  return { projectSlug, apiKey, baseUrl };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Pakasir request gagal (${response.status})`);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Pakasir request timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildPakasirPayUrl(orderId: string, amount: number, redirectUrl?: string) {
  const { projectSlug, baseUrl } = getConfig();
  const url = new URL(`/pay/${projectSlug}/${amount}`, baseUrl);
  url.searchParams.set("order_id", orderId);
  if (redirectUrl) url.searchParams.set("redirect", redirectUrl);
  return url.toString();
}

export async function createPakasirTransaction(orderId: string, amount: number, method = "qris") {
  const { projectSlug, apiKey, baseUrl } = getConfig();
  return fetchJson<{ payment: PakasirPayment }>(`${baseUrl}/api/transactioncreate/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: projectSlug, order_id: orderId, amount, api_key: apiKey }),
  });
}

export async function getPakasirTransactionDetail(orderId: string, amount: number) {
  const { projectSlug, apiKey, baseUrl } = getConfig();
  const url = new URL("/api/transactiondetail", baseUrl);
  url.searchParams.set("project", projectSlug);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("order_id", orderId);
  url.searchParams.set("api_key", apiKey);
  return fetchJson<{ transaction: PakasirTransaction }>(url.toString());
}

export async function cancelPakasirTransaction(orderId: string, amount: number) {
  const { projectSlug, apiKey, baseUrl } = getConfig();
  return fetchJson<{ transaction: PakasirTransaction }>(`${baseUrl}/api/transactioncancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: projectSlug, order_id: orderId, amount, api_key: apiKey }),
  });
}

export function isCompletedPakasirStatus(status: string) {
  return status.toLowerCase() === "completed";
}
