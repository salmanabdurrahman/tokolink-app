import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type VercelHeader = {
  key: string;
  value: string;
};

type VercelHeaderRule = {
  source: string;
  headers: VercelHeader[];
};

type VercelConfig = {
  framework: null;
  buildCommand: string;
  installCommand: string;
  outputDirectory: string;
  headers: VercelHeaderRule[];
};

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
) as VercelConfig;

const headersFor = (source: string) =>
  Object.fromEntries(
    config.headers
      .find((rule) => rule.source === source)
      ?.headers.map((header) => [header.key, header.value]) ?? [],
  );

describe("vercel production config", () => {
  it("uses reproducible Bun installs and Nitro Vercel output", () => {
    expect(config.framework).toBeNull();
    expect(config.installCommand).toBe("bun install --frozen-lockfile");
    expect(config.buildCommand).toBe("bun run build");
    expect(config.outputDirectory).toBe(".vercel/output");
  });

  it("sets baseline browser security headers globally", () => {
    expect(headersFor("/(.*)")).toMatchObject({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    });
  });

  it("keeps immutable assets cached and API responses uncached", () => {
    expect(headersFor("/assets/(.*)")).toMatchObject({
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    expect(headersFor("/api/(.*)")).toMatchObject({
      "Cache-Control": "no-store",
    });
  });
});
