import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/types";
import { useShippingQuote } from "./use-shipping-quote";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

describe("useShippingQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads shipping options after selecting a destination", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          options: [
            { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
          ],
        }),
      ) as any,
    );

    const { result } = renderHook(() => useShippingQuote({ tenantSlug: "kopi-ibu", items }));

    await act(async () => {
      await result.current.handleDestinationChange(destination);
    });

    await waitFor(() => expect(result.current.shippingOptions).toHaveLength(1));
    expect(result.current.selectedDestination).toEqual(destination);
    expect(result.current.loadingShipping).toBe(false);
  });

  it("resets state when destination is cleared", async () => {
    const { result } = renderHook(() => useShippingQuote({ tenantSlug: "kopi-ibu", items }));

    act(() => {
      result.current.handleDestinationChange(null);
    });

    expect(result.current.selectedDestination).toBeNull();
    expect(result.current.shippingOptions).toEqual([]);
    expect(result.current.shipping).toEqual({ courier: "", service: "", etd: "", cost: 0 });
  });

  it("shows a toast error when shipping cost request fails", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Ongkir belum tersedia" }, { status: 400 }),
      ) as any,
    );

    const { result } = renderHook(() => useShippingQuote({ tenantSlug: "kopi-ibu", items }));

    await act(async () => {
      await result.current.handleDestinationChange(destination);
    });

    expect(toast.error).toHaveBeenCalledWith("Ongkir belum tersedia");
  });

  it("selects a shipping option", () => {
    const { result } = renderHook(() => useShippingQuote({ tenantSlug: "kopi-ibu", items }));
    const option = {
      courier: "jne",
      service: "REG",
      description: "Regular",
      cost: 12000,
      etd: "1-2",
    };

    act(() => {
      result.current.selectShipping(option);
    });

    expect(result.current.shipping).toEqual({
      courier: "jne",
      service: "REG",
      etd: "1-2",
      cost: 12000,
    });
  });
});
