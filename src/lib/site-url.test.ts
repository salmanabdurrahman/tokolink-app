import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PUBLIC_SITE_URL,
  getPublicHostname,
  getPublicSiteUrl,
  getPublicUrl,
  normalizeSiteUrl,
} from "./site-url";

describe("site-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes trailing slashes and whitespace", () => {
    expect(normalizeSiteUrl(" https://tokolink.test/// ")).toBe("https://tokolink.test");
  });

  it("uses default public URL when env is empty", () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "");
    vi.stubEnv("VITE_SITE_URL", "");

    expect(getPublicSiteUrl()).toBe(DEFAULT_PUBLIC_SITE_URL);
  });

  it("prefers VITE_PUBLIC_SITE_URL over legacy site URL", () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://public.test/");
    vi.stubEnv("VITE_SITE_URL", "https://legacy.test/");

    expect(getPublicSiteUrl()).toBe("https://public.test");
  });

  it("builds public URLs from paths", () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://tokolink.test/");

    expect(getPublicUrl()).toBe("https://tokolink.test");
    expect(getPublicUrl("kopi-ibu")).toBe("https://tokolink.test/kopi-ibu");
    expect(getPublicUrl("/dashboard")).toBe("https://tokolink.test/dashboard");
  });

  it("returns public hostname", () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://tokolink.test/store");

    expect(getPublicHostname()).toBe("tokolink.test");
  });
});
