export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const hostname = parsed.hostname;

    if (hostname.endsWith(".public.blob.vercel-storage.com")) return true;
    if (hostname === "api.dicebear.com") return true;
    if (hostname === "tokolink.app") return true;

    if (process.env.NODE_ENV !== "production") {
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function isSupportedOgImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!isSafeImageUrl(url)) return false;
  try {
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg");
  } catch {
    return false;
  }
}
