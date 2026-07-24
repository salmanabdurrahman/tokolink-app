import type React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    button: "button",
    div: "div",
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useCart } from "../../lib/store";
import { FloatingCart } from "./floating-cart";

const item = {
  key: "kopi-small",
  productId: "product-1",
  productName: "Kopi Susu",
  variantId: "small",
  variantName: "Small",
  unitPrice: 10000,
  qty: 1,
  image: "",
};

describe("FloatingCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.setState({ items: [item], tenantSlug: undefined });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("destinations")) {
          return Response.json([
            {
              id: "dest-1",
              label: "Senayan, Jakarta Selatan",
              provinceName: "DKI Jakarta",
              cityName: "Jakarta Selatan",
              districtName: "Kebayoran Baru",
              subdistrictName: "Senayan",
              zipCode: "12110",
            },
          ]);
        }
        if (url.includes("costs")) {
          return Response.json({
            weightGram: 250,
            options: [
              { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
            ],
          });
        }
        return Response.json({ orderNumber: "TL1", paymentUrl: "https://pay.test", total: 22000 });
      }) as any,
    );
    vi.stubGlobal("location", { assign: vi.fn() } as any);
  });

  it("opens cart, updates qty, searches destination, selects shipping, and checks out", async () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah Kopi Susu" }));
    expect(useCart.getState().items[0].qty).toBe(2);

    fireEvent.change(screen.getByPlaceholderText("Cari kecamatan/kelurahan"), {
      target: { value: "senayan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));
    fireEvent.click(await screen.findByRole("button", { name: "Senayan, Jakarta Selatan" }));
    fireEvent.click(await screen.findByRole("button", { name: /jne REG/i }));

    fireEvent.change(screen.getByPlaceholderText("Nama lengkap"), { target: { value: "Budi" } });
    fireEvent.change(screen.getByPlaceholderText("WhatsApp, contoh 628123456789"), {
      target: { value: "081234567890" },
    });
    fireEvent.change(screen.getByPlaceholderText("Alamat pengiriman"), {
      target: { value: "Jl. Melati 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bayar via Pakasir →" }));

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("https://pay.test"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/checkout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows WhatsApp fallback when store phone missing", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));

    expect(screen.getByText(/Nomor WhatsApp toko belum diisi/)).toBeInTheDocument();
  });
});
