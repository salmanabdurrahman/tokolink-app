import { afterEach, describe, expect, it } from "vitest";
import { isSafeImageUrl, isSupportedOgImage } from "./og";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe("OG image safety", () => {
  it("allows trusted image hosts", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com";

    expect(isSafeImageUrl("https://asset.public.blob.vercel-storage.com/a.png")).toBe(true);
    expect(isSafeImageUrl("https://media.example.com/tenants/tenant-1/avatar.png")).toBe(true);
    expect(isSafeImageUrl("https://api.dicebear.com/9.x/initials/svg?seed=Toko")).toBe(true);
    expect(isSafeImageUrl("https://tokolink-v2.vercel.app/og-main.png")).toBe(true);
  });

  it("rejects private/local hosts in production and unsupported protocols", () => {
    process.env.NODE_ENV = "production";

    expect(isSafeImageUrl("http://localhost/avatar.png")).toBe(false);
    expect(isSafeImageUrl("http://127.0.0.1/avatar.png")).toBe(false);
    expect(isSafeImageUrl("http://192.168.1.2/avatar.png")).toBe(false);
    expect(isSafeImageUrl("file:///etc/passwd")).toBe(false);
  });

  it("allows local hosts outside production for development previews", () => {
    process.env.NODE_ENV = "development";

    expect(isSafeImageUrl("http://localhost/avatar.png")).toBe(true);
    expect(isSafeImageUrl("http://127.0.0.1/avatar.png")).toBe(true);
    expect(isSafeImageUrl("http://192.168.1.2/avatar.png")).toBe(true);
  });

  it("supports only PNG and JPEG files for OG rendering", () => {
    expect(isSupportedOgImage("https://tokolink-v2.vercel.app/avatar.png?cache=1")).toBe(true);
    expect(isSupportedOgImage("https://tokolink-v2.vercel.app/avatar.jpg")).toBe(true);
    expect(isSupportedOgImage("https://tokolink-v2.vercel.app/avatar.jpeg")).toBe(true);
    expect(isSupportedOgImage("https://tokolink-v2.vercel.app/avatar.webp")).toBe(false);
    expect(isSupportedOgImage("https://evil.example/avatar.png")).toBe(false);
  });

  it("rejects null, undefined, empty, and invalid URLs", () => {
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl("")).toBe(false);
    expect(isSafeImageUrl("not-a-url")).toBe(false);
    expect(isSafeImageUrl("file:///etc/passwd")).toBe(false);
    expect(isSupportedOgImage(null)).toBe(false);
    expect(isSupportedOgImage(undefined)).toBe(false);
    expect(isSupportedOgImage("not-a-url")).toBe(false);
  });
});
