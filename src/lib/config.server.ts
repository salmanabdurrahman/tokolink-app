import process from "node:process";
import { normalizeSiteUrl } from "./site-url";

const DEFAULT_LOCAL_SITE_URL = "http://localhost:3000";

export function getPublicSiteUrlServer() {
  return normalizeSiteUrl(
    process.env.SITE_URL ||
      process.env.VITE_PUBLIC_SITE_URL ||
      process.env.VITE_SITE_URL ||
      DEFAULT_LOCAL_SITE_URL,
  );
}

export function getPublicUrlServer(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteUrlServer()}${normalizedPath === "/" ? "" : normalizedPath}`;
}

// AI (product copy / sales insight) is an optional additive feature: when the
// key is absent the server functions fail gracefully instead of the app
// refusing to boot, so this is presence-only and does not gate `/api/health`.
export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    publicSiteUrl: getPublicSiteUrlServer(),
    aiConfigured: isAiConfigured(),
  };
}
