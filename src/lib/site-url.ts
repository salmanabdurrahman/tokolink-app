export const DEFAULT_PUBLIC_SITE_URL = "https://tokolink-v2.vercel.app";

export function normalizeSiteUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export function getPublicSiteUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_SITE_URL;
  return normalizeSiteUrl(configuredUrl || DEFAULT_PUBLIC_SITE_URL);
}

export function getPublicUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteUrl()}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function getPublicHostname() {
  return new URL(getPublicSiteUrl()).hostname;
}
