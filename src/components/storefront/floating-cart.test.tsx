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
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

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
        if (url.includes("/api/shipping/provinces")) return Response.json([]);
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

    fireEvent.click(screen.getByRole("button", { name: "Cari cepat" }));
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

  it("keeps customer input focused while typing", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    const nameInput = screen.getByPlaceholderText("Nama lengkap");

    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: "Budi" } });

    expect(nameInput).toHaveFocus();
  });

  it("shows WhatsApp fallback when store phone missing", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));

    expect(screen.getByText(/Nomor WhatsApp toko belum diisi/)).toBeInTheDocument();
  });

  it("redirects to WhatsApp with the built order message", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Chat WhatsApp →" }));

    expect(window.location.assign).toHaveBeenCalledWith(expect.stringContaining("https://wa.me/"));
  });

  it("decrements item qty via the minus button", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Kurangi Kopi Susu" }));

    expect(useCart.getState().items).toHaveLength(0);
  });

  it("clears the cart when 'Kosongkan keranjang' is clicked", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Kosongkan keranjang" }));

    expect(useCart.getState().items).toHaveLength(0);
  });

  it("closes the sheet via the close control", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    expect(screen.getByText("Keranjang")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tutup panel" }));

    expect(screen.queryByText("Keranjang")).not.toBeInTheDocument();
  });

  it("updates the order note field", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    const note = screen.getByPlaceholderText(/Titip di pos satpam/);
    fireEvent.change(note, { target: { value: "Tolong bungkus rapi" } });

    expect(note).toHaveValue("Tolong bungkus rapi");
  });

  it("updates the customer email field", () => {
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    const email = screen.getByPlaceholderText(/Email receipt/);
    fireEvent.change(email, { target: { value: "budi@test.com" } });

    expect(email).toHaveValue("budi@test.com");
  });

  it("shows an error toast when destination search returns no results", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([])) as any);

    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);
    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cari cepat" }));
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Lokasi tidak ditemukan"));
  });

  it("shows an error toast when destination search request fails", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/shipping/provinces")) return Response.json([]);
        throw new Error("network down");
      }) as any,
    );

    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);
    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cari cepat" }));
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("network down"));
  });

  it("shows an error toast when shipping cost lookup fails", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/shipping/provinces")) return Response.json([]);
        if (url.includes("destinations")) {
          return Response.json([
            {
              id: "dest-1",
              label: "Senayan, Jakarta Selatan",
              provinceName: "DKI Jakarta",
              cityName: "Jakarta Selatan",
              districtName: "",
              subdistrictName: "Senayan",
              zipCode: "12110",
            },
          ]);
        }
        if (url.includes("costs")) {
          return Response.json({ message: "Ongkir belum tersedia" }, { status: 400 });
        }
        return Response.json({});
      }) as any,
    );

    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);
    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cari cepat" }));
    fireEvent.change(screen.getByPlaceholderText("Cari kecamatan/kelurahan"), {
      target: { value: "senayan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));
    fireEvent.click(await screen.findByRole("button", { name: "Senayan, Jakarta Selatan" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ongkir belum tersedia"));
  });

  it("blocks checkout with a toast when no shipping option selected", async () => {
    const { toast } = await import("sonner");
    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);

    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Bayar via Pakasir →" }));

    expect(toast.error).toHaveBeenCalledWith("Pilih tujuan dan layanan pengiriman dulu");
    expect(fetch).not.toHaveBeenCalledWith("/api/checkout", expect.anything());
  });

  it("shows an error toast when checkout response has no payment url", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/shipping/provinces")) return Response.json([]);
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
            options: [
              { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
            ],
          });
        }
        return Response.json({ orderNumber: "TL1" });
      }) as any,
    );

    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);
    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cari cepat" }));
    fireEvent.change(screen.getByPlaceholderText("Cari kecamatan/kelurahan"), {
      target: { value: "senayan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));
    fireEvent.click(await screen.findByRole("button", { name: "Senayan, Jakarta Selatan" }));
    fireEvent.click(await screen.findByRole("button", { name: /jne REG/i }));
    fireEvent.click(screen.getByRole("button", { name: "Bayar via Pakasir →" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Link pembayaran tidak tersedia"));
  });

  it("shows an error toast when checkout request fails", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/shipping/provinces")) return Response.json([]);
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
            options: [
              { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
            ],
          });
        }
        return Response.json({ message: "Checkout gagal. Coba lagi." }, { status: 500 });
      }) as any,
    );

    render(<FloatingCart tenantSlug="kopi-ibu" storeName="Kopi Ibu" phone="081234567890" />);
    fireEvent.click(screen.getByRole("button", { name: /1 item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cari cepat" }));
    fireEvent.change(screen.getByPlaceholderText("Cari kecamatan/kelurahan"), {
      target: { value: "senayan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));
    fireEvent.click(await screen.findByRole("button", { name: "Senayan, Jakarta Selatan" }));
    fireEvent.click(await screen.findByRole("button", { name: /jne REG/i }));
    fireEvent.click(screen.getByRole("button", { name: "Bayar via Pakasir →" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Checkout gagal. Coba lagi."));
  });
});
