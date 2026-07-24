import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateIndonesia,
  formatDateTimeIndonesia,
  formatPercentIndonesia,
} from "./formatters";

describe("formatters", () => {
  it("formats Indonesian currency variants", () => {
    expect(formatCurrency(12500)).toBe("Rp 12.500");
    expect(formatCurrencyCompact(12500)).toBe("Rp12.500");
  });

  it("formats Indonesian percent with max two decimals", () => {
    expect(formatPercentIndonesia(12.345)).toBe("12,35%");
    expect(formatPercentIndonesia(10)).toBe("10%");
  });

  it("formats Indonesian dates and times", () => {
    const date = new Date("2025-01-02T03:04:00.000Z");

    expect(formatDateIndonesia(date)).toContain("2025");
    expect(formatDateTimeIndonesia(date)).toMatch(/02 Jan 2025, \d{2}\.04/);
  });
});
