import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redactLogFields } from "./logger.server";

describe("logger redaction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("redacts sensitive field names recursively", () => {
    expect(
      redactLogFields({
        cookie: "session",
        nested: { apiKey: "secret", ok: "value" },
        list: [{ token: "secret" }],
      }),
    ).toEqual({
      cookie: "[redacted]",
      nested: { apiKey: "[redacted]", ok: "value" },
      list: [{ token: "[redacted]" }],
    });
  });

  it("keeps nulls and primitive values safe", () => {
    expect(redactLogFields({ empty: null, count: 2, enabled: true })).toEqual({
      empty: null,
      count: 2,
      enabled: true,
    });
  });

  it("truncates long string values", () => {
    expect(redactLogFields({ message: "a".repeat(205) })).toEqual({
      message: `${"a".repeat(200)}…`,
    });
  });

  it("serializes errors with stack outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    const result = redactLogFields({ error: new Error("boom") });

    expect(result.error).toMatchObject({ name: "Error", message: "boom" });
    expect((result.error as { stack?: string }).stack).toContain("Error: boom");
  });

  it("omits error stack in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = redactLogFields({ error: new Error("boom") });

    expect(result.error).toEqual({ name: "Error", message: "boom", stack: undefined });
  });
});

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes info, warn, and error logs as JSON", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.info("tenant loaded", { tenantId: "tenant-1" });
    logger.warn("slow request", { durationMs: 1200 });
    logger.error("checkout failed", { token: "secret" });

    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({
      level: "info",
      message: "tenant loaded",
      tenantId: "tenant-1",
    });
    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({
      level: "warn",
      message: "slow request",
      durationMs: 1200,
    });
    expect(JSON.parse(error.mock.calls[0][0])).toMatchObject({
      level: "error",
      message: "checkout failed",
      token: "[redacted]",
    });
  });
});
