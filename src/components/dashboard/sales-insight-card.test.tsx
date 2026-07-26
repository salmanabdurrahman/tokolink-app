import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateSalesInsight = vi.fn();
vi.mock("@/server/ai.functions", () => ({
  generateSalesInsight: (...args: unknown[]) => generateSalesInsight(...args),
}));

import { SalesInsightCard } from "./sales-insight-card";

describe("SalesInsightCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the AI summary when available", async () => {
    generateSalesInsight.mockResolvedValue({
      summary: "Penjualan naik 20% dibanding bulan lalu.",
      aiAvailable: true,
      metrics: {
        days: 30,
        currentSalesTotal: 500000,
        salesDeltaPercent: 20,
        topProductName: "Kopi Susu",
        topProductQty: 5,
        pendingPaymentCount: 1,
        shippedPendingCount: 2,
        availableBalance: 100000,
      },
    });

    render(<SalesInsightCard />);

    expect(await screen.findByText("Penjualan naik 20% dibanding bulan lalu.")).toBeInTheDocument();
    expect(generateSalesInsight).toHaveBeenCalledWith({
      data: { days: 30, regenerate: false },
    });
  });

  it("falls back to raw metrics when AI is unavailable", async () => {
    generateSalesInsight.mockResolvedValue({
      summary: null,
      aiAvailable: false,
      metrics: {
        days: 30,
        currentSalesTotal: 150000,
        salesDeltaPercent: null,
        topProductName: "Cold Brew",
        topProductQty: 3,
        pendingPaymentCount: 2,
        shippedPendingCount: 0,
        availableBalance: 0,
      },
    });

    render(<SalesInsightCard />);

    expect(
      await screen.findByText("Ringkasan AI belum tersedia saat ini. Berikut data mentahnya:"),
    ).toBeInTheDocument();
    expect(screen.getByText("Rp 150.000")).toBeInTheDocument();
    expect(screen.getByText(/Cold Brew/)).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    generateSalesInsight.mockRejectedValue(new Error("network error"));

    render(<SalesInsightCard />);

    expect(
      await screen.findByText("Gagal memuat ringkasan toko. Coba muat ulang halaman."),
    ).toBeInTheDocument();
  });

  it("regenerates the insight when the refresh button is clicked", async () => {
    generateSalesInsight.mockResolvedValue({
      summary: "Ringkasan pertama.",
      aiAvailable: true,
      metrics: {
        days: 30,
        currentSalesTotal: 0,
        salesDeltaPercent: null,
        topProductName: null,
        topProductQty: 0,
        pendingPaymentCount: 0,
        shippedPendingCount: 0,
        availableBalance: 0,
      },
    });

    render(<SalesInsightCard />);
    await screen.findByText("Ringkasan pertama.");

    generateSalesInsight.mockResolvedValueOnce({
      summary: "Ringkasan diperbarui.",
      aiAvailable: true,
      metrics: {
        days: 30,
        currentSalesTotal: 0,
        salesDeltaPercent: null,
        topProductName: null,
        topProductQty: 0,
        pendingPaymentCount: 0,
        shippedPendingCount: 0,
        availableBalance: 0,
      },
    });

    screen.getByRole("button", { name: "Perbarui" }).click();

    await waitFor(() =>
      expect(generateSalesInsight).toHaveBeenLastCalledWith({
        data: { days: 30, regenerate: true },
      }),
    );
    expect(await screen.findByText("Ringkasan diperbarui.")).toBeInTheDocument();
  });
});
