import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPublicSiteUrlServer,
  getPublicUrlServer,
  getServerConfig,
  isAiConfigured,
} from "./config.server";

describe("config.server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses local default public site URL", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "");
    vi.stubEnv("VITE_SITE_URL", "");

    expect(getPublicSiteUrlServer()).toBe("http://localhost:3000");
  });

  it("prefers SITE_URL and normalizes trailing slashes", () => {
    vi.stubEnv("SITE_URL", "https://admin.tokolink.test///");
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://public.tokolink.test");

    expect(getPublicSiteUrlServer()).toBe("https://admin.tokolink.test");
  });

  it("falls back to public Vite env vars", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://public.tokolink.test/");

    expect(getPublicSiteUrlServer()).toBe("https://public.tokolink.test");
  });

  it("builds server public URLs from paths", () => {
    vi.stubEnv("SITE_URL", "https://tokolink.test/");

    expect(getPublicUrlServer()).toBe("https://tokolink.test");
    expect(getPublicUrlServer("kopi-ibu")).toBe("https://tokolink.test/kopi-ibu");
    expect(getPublicUrlServer("/dashboard")).toBe("https://tokolink.test/dashboard");
  });

  it("returns server config snapshot", () => {
    vi.stubEnv("SITE_URL", "https://tokolink.test/");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OPENAI_API_KEY", "");

    expect(getServerConfig()).toEqual({
      nodeEnv: "test",
      publicSiteUrl: "https://tokolink.test",
      aiConfigured: false,
    });
  });

  it("reports AI configured only when OPENAI_API_KEY is present", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isAiConfigured()).toBe(false);

    vi.stubEnv("OPENAI_API_KEY", "secret-key");
    expect(isAiConfigured()).toBe(true);
  });
});
