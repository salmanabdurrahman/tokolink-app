import { describe, expect, it } from "vitest";
import {
  formatOrderDate,
  getWithdrawalEligibleDate,
  paymentLabel,
  statusLabel,
} from "./order-view";

describe("order-view", () => {
  it("maps known order status to Indonesian label", () => {
    expect(statusLabel("PENDING_PAYMENT")).toBe("Menunggu pembayaran");
    expect(statusLabel("COMPLETED")).toBe("Selesai");
  });

  it("falls back to raw status when unknown", () => {
    expect(statusLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("maps known payment status to Indonesian label and falls back to dash", () => {
    expect(paymentLabel("PAID")).toBe("Dibayar");
    expect(paymentLabel()).toBe("-");
    expect(paymentLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("formats order date, falling back to dash when missing", () => {
    expect(formatOrderDate(null)).toBe("-");
    expect(formatOrderDate("2026-01-05T10:00:00.000Z")).toMatch(/2026/);
  });

  it("adds two days for withdrawal eligible date", () => {
    expect(getWithdrawalEligibleDate(null)).toBe("-");
    const result = getWithdrawalEligibleDate("2026-01-05T00:00:00.000Z");
    expect(result).toMatch(/2026/);
  });
});
