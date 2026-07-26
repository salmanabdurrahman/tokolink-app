import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/types";
import { useCheckoutFlow } from "./use-checkout-flow";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const items: CartItem[] = [
  {
    key: "kopi-small",
    productId: "product-1",
    productName: "Kopi Susu",
    variantId: "small",
    variantName: "Small",
    unitPrice: 10000,
    qty: 1,
    image: "",
  },
];

const destination = {
  id: "dest-1",
  label: "Senayan, Jakarta Selatan",
  provinceName: "DKI Jakarta",
  cityName: "Jakarta Selatan",
  districtName: "Kebayoran Baru",
  subdistrictName: "Senayan",
  zipCode: "12110",
};

const shipping = { courier: "jne", service: "REG", etd: "1-2", cost: 12000 };

const validCustomer = {
  name: "Budi Santoso",
  email: "",
  whatsapp: "628123456789",
  address: "Jl. Merdeka No. 1, Jakarta",
};

function setup(overrides: Partial<Parameters<typeof useCheckoutFlow>[0]> = {}) {
  const onOrderCreated = vi.fn();
  const { result } = renderHook(() =>
    useCheckoutFlow({
      tenantSlug: "kopi-ibu",
      storeName: "Kopi Ibu",
      phone: "081234567890",
      items,
      totalPrice: 10000,
      selectedDestination: destination,
      shipping,
      onOrderCreated,
      ...overrides,
    }),
  );
  return { result, onOrderCreated };
}

describe("useCheckoutFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("location", { assign: vi.fn() } as any);
  });

  it("blocks checkout with per-field errors and a readable toast when customer data is invalid", async () => {
    const { toast } = await import("sonner");
    const { result } = setup();

    await act(async () => {
      await result.current.checkoutPakasir();
    });

    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('"validation"'));
    expect(result.current.errors.name).toBeTruthy();
    expect(result.current.errors.whatsapp).toBeTruthy();
    expect(result.current.errors.address).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks checkout with a toast when no shipping option selected", async () => {
    const { toast } = await import("sonner");
    const { result } = setup({
      selectedDestination: null,
      shipping: { courier: "", service: "", etd: "", cost: 0 },
    });

    act(() => {
      result.current.setCustomer(validCustomer);
    });

    await act(async () => {
      await result.current.checkoutPakasir();
    });

    expect(toast.error).toHaveBeenCalledWith("Pilih tujuan dan layanan pengiriman dulu");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates an order and redirects to payment url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ orderNumber: "TL1", paymentUrl: "https://pay.test" }),
      ) as any,
    );
    const { result, onOrderCreated } = setup();

    act(() => {
      result.current.setCustomer(validCustomer);
    });

    await act(async () => {
      await result.current.checkoutPakasir();
    });

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("https://pay.test"));
    expect(onOrderCreated).toHaveBeenCalled();
    expect(result.current.note).toBe("");
  });

  it("shows an error toast when checkout response has no payment url", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ orderNumber: "TL1" })) as any);
    const { result } = setup();

    act(() => {
      result.current.setCustomer(validCustomer);
    });

    await act(async () => {
      await result.current.checkoutPakasir();
    });

    expect(toast.error).toHaveBeenCalledWith("Link pembayaran tidak tersedia");
  });

  it("shows an error toast when checkout request fails", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Checkout gagal. Coba lagi." }, { status: 500 }),
      ) as any,
    );
    const { result } = setup();

    act(() => {
      result.current.setCustomer(validCustomer);
    });

    await act(async () => {
      await result.current.checkoutPakasir();
    });

    expect(toast.error).toHaveBeenCalledWith("Checkout gagal. Coba lagi.");
  });

  it("redirects to WhatsApp with the built order message", () => {
    const { result } = setup();

    act(() => {
      result.current.checkoutWhatsApp();
    });

    expect(window.location.assign).toHaveBeenCalledWith(expect.stringContaining("https://wa.me/"));
  });

  it("shows a toast error when store whatsapp number is missing", async () => {
    const { toast } = await import("sonner");
    const { result } = setup({ phone: "" });

    act(() => {
      result.current.checkoutWhatsApp();
    });

    expect(toast.error).toHaveBeenCalledWith("Nomor WhatsApp toko belum tersedia");
  });
});
