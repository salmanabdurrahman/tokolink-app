import { afterEach, describe, expect, it, vi } from "vitest";
import { isExpectedLoaderError, logLoaderError } from "./loader-error";

describe("isExpectedLoaderError", () => {
  it("matches known expected auth/tenant error prefixes", () => {
    expect(isExpectedLoaderError(new Error("Tidak terautentikasi"))).toBe(true);
    expect(isExpectedLoaderError(new Error("Toko tidak ditemukan"))).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isExpectedLoaderError(new Error("Database connection lost"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isExpectedLoaderError("Tidak terautentikasi")).toBe(false);
    expect(isExpectedLoaderError(undefined)).toBe(false);
  });
});

describe("logLoaderError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs unexpected errors with scope prefix", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("DB down");

    logLoaderError("tenant.loader", error);

    expect(spy).toHaveBeenCalledWith("[loader_error] tenant.loader:", error);
  });

  it("does not log expected auth/tenant errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logLoaderError("tenant.loader", new Error("Tidak terautentikasi"));

    expect(spy).not.toHaveBeenCalled();
  });
});
