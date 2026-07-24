import { describe, expect, it } from "vitest";
import { cn, formatIDR, formatWhatsAppNumber, getErrorMessage } from "./utils";

describe("cn", () => {
  it("merges conditional Tailwind classes", () => {
    const isHidden = false;

    expect(cn("px-2", isHidden && "hidden", "px-4", "text-sm")).toBe("px-4 text-sm");
  });
});

describe("formatIDR", () => {
  it("formats numbers as Indonesian Rupiah without decimals", () => {
    expect(formatIDR(12500)).toBe("Rp 12.500");
  });
});

describe("getErrorMessage", () => {
  it("returns empty string for empty errors", () => {
    expect(getErrorMessage(null)).toBe("");
  });

  it("parses TanStack/Zod-style JSON error messages with path", () => {
    const error = new Error(
      JSON.stringify([{ path: ["profile", "name"], message: "Wajib diisi" }]),
    );

    expect(getErrorMessage(error)).toBe("profile.name - Wajib diisi");
  });

  it("parses JSON error messages without path", () => {
    const error = new Error(JSON.stringify([{ message: "Tidak valid" }]));

    expect(getErrorMessage(error)).toBe("Tidak valid");
  });

  it("returns JSON text when parsed message has no first message", () => {
    expect(getErrorMessage(new Error("[]"))).toBe("[]");
    expect(getErrorMessage(new Error(JSON.stringify([{ path: ["name"] }])))).toBe(
      '[{"path":["name"]}]',
    );
  });

  it("falls back to original message for invalid JSON array-like text", () => {
    expect(getErrorMessage(new Error("[invalid"))).toBe("[invalid");
  });

  it("stringifies non-error values", () => {
    expect(getErrorMessage("Gagal menyimpan")).toBe("Gagal menyimpan");
  });
});

describe("formatWhatsAppNumber", () => {
  it("keeps international numbers and strips non-digits", () => {
    expect(formatWhatsAppNumber("+62 812-3456-7890")).toBe("6281234567890");
  });
});
