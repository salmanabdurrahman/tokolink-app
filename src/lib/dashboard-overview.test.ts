import { describe, expect, it } from "vitest";
import { buildDashboardCtas } from "./dashboard-overview";

const formatCurrency = (value: number) => `Rp${value}`;

const baseInput = {
  isNewTenant: false,
  whatsapp: "628123456789",
  pendingPaymentCount: 0,
  orderCount: 0,
  availableBalance: 0,
  minWithdrawalAmount: 50_000,
  formatCurrency,
};

describe("buildDashboardCtas", () => {
  it("always includes the share-store CTA", () => {
    const ctas = buildDashboardCtas(baseInput);

    expect(ctas.some((c) => c.key === "share-store")).toBe(true);
  });

  it("shows onboarding add-product CTA and hides process-orders CTA for a new tenant", () => {
    const ctas = buildDashboardCtas({ ...baseInput, isNewTenant: true, orderCount: 3 });

    expect(ctas.map((c) => c.key)).toEqual(["add-product", "share-store"]);
  });

  it("shows setup-whatsapp CTA when whatsapp is not configured", () => {
    const ctas = buildDashboardCtas({ ...baseInput, whatsapp: "" });

    expect(ctas.some((c) => c.key === "setup-whatsapp")).toBe(true);
  });

  it("hides setup-whatsapp CTA when whatsapp is configured", () => {
    const ctas = buildDashboardCtas(baseInput);

    expect(ctas.some((c) => c.key === "setup-whatsapp")).toBe(false);
  });

  it("shows process-orders CTA when there are pending payments or unshipped orders", () => {
    const pendingPayment = buildDashboardCtas({ ...baseInput, pendingPaymentCount: 2 });
    const needsShipping = buildDashboardCtas({ ...baseInput, orderCount: 1 });

    expect(pendingPayment.some((c) => c.key === "process-orders")).toBe(true);
    expect(needsShipping.some((c) => c.key === "process-orders")).toBe(true);
  });

  it("hides process-orders CTA when there is nothing to process", () => {
    const ctas = buildDashboardCtas(baseInput);

    expect(ctas.some((c) => c.key === "process-orders")).toBe(false);
  });

  it("shows withdraw-balance CTA only when balance meets the minimum", () => {
    const eligible = buildDashboardCtas({ ...baseInput, availableBalance: 50_000 });
    const ineligible = buildDashboardCtas({ ...baseInput, availableBalance: 49_999 });

    expect(eligible.some((c) => c.key === "withdraw-balance")).toBe(true);
    expect(ineligible.some((c) => c.key === "withdraw-balance")).toBe(false);
  });

  it("returns CTAs in priority order: onboarding, whatsapp, orders, saldo, share", () => {
    const ctas = buildDashboardCtas({
      isNewTenant: true,
      whatsapp: "",
      pendingPaymentCount: 1,
      orderCount: 1,
      availableBalance: 100_000,
      minWithdrawalAmount: 50_000,
      formatCurrency,
    });

    expect(ctas.map((c) => c.key)).toEqual([
      "add-product",
      "setup-whatsapp",
      "withdraw-balance",
      "share-store",
    ]);
  });
});
