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

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    publicSiteUrl: getPublicSiteUrlServer(),
  };
}
