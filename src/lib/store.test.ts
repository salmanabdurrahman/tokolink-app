import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildWhatsAppUrl, useCart } from "./store";
import { formatWhatsAppNumber } from "./utils";
import type { CartItem } from "./types";

const items: CartItem[] = [
  {
    key: "kopi-large",
    productId: "product-1",
    productName: "Kopi Susu",
    variantId: "variant-1",
    variantName: "Large",
    unitPrice: 18000,
    qty: 2,
    image: "",
  },
  {
    key: "roti",
    productId: "product-2",
    productName: "Roti Coklat",
    unitPrice: 12000,
    qty: 1,
    image: "",
  },
];

describe("buildWhatsAppUrl", () => {
  it("formats order message with variants, note, total, and URL encoding", () => {
    const url = buildWhatsAppUrl("628123456789", "Toko Kopi", items, 48000, "Tanpa es ya");
    const parsed = new URL(url);
    const text = parsed.searchParams.get("text") ?? "";

    expect(parsed.origin + parsed.pathname).toBe("https://wa.me/628123456789");
    expect(text).toContain("Halo *Toko Kopi*, saya mau order pesanan berikut ya:");
    expect(text).toContain("▪ 2x Kopi Susu (Large)\n  Rp36.000");
    expect(text).toContain("▪ 1x Roti Coklat\n  Rp12.000");
    expect(text).toContain("*Catatan:*\nTanpa es ya");
    expect(text).toContain("*Total Pesanan: Rp48.000*");
  });

  it("omits note section when note is empty", () => {
    const url = buildWhatsAppUrl("628123456789", "Toko Kopi", items, 48000);
    const text = new URL(url).searchParams.get("text") ?? "";

    expect(text).not.toContain("*Catatan:*");
  });

  it("uses custom WhatsApp template when provided", () => {
    const url = buildWhatsAppUrl(
      "628123456789",
      "Toko Kopi",
      items,
      48000,
      "Tanpa es ya",
      "Halo, saya mau pesan dari promo offline.",
    );
    const text = new URL(url).searchParams.get("text") ?? "";

    expect(text).toContain("Halo, saya mau pesan dari promo offline.");
    expect(text).toContain("▪ 2x Kopi Susu (Large)");
    expect(text).not.toContain("Mohon info instruksi pembayarannya");
  });

  it("handles empty items list and missing variant gracefully", () => {
    const noVariantItem: CartItem = {
      key: "roti",
      productId: "product-1",
      productName: "Roti Coklat",
      unitPrice: 12000,
      qty: 1,
      image: "",
    };
    const url = buildWhatsAppUrl("628123456789", "Toko", [noVariantItem], 12000);
    const text = new URL(url).searchParams.get("text") ?? "";

    expect(text).toContain("▪ 1x Roti Coklat");
    expect(text).not.toContain("(null)");
  });
});

describe("formatWhatsAppNumber", () => {
  it("normalizes Indonesian local numbers", () => {
    expect(formatWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(formatWhatsAppNumber("81234567890")).toBe("6281234567890");
    expect(formatWhatsAppNumber("6281234567890")).toBe("6281234567890");
  });
});

describe("useCart", () => {
  beforeEach(() => {
    act(() => {
      useCart.getState().setTenantSlug("tenant-a");
      useCart.getState().clear();
    });
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalQty()).toBe(0);
    expect(result.current.totalPrice()).toBe(0);
  });

  it("clears persisted cart when storefront tenant changes", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    expect(result.current.items).toHaveLength(1);

    act(() => result.current.setTenantSlug("tenant-b"));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.tenantSlug).toBe("tenant-b");
  });

  it("adds item and increments quantity for duplicate key", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);

    act(() => result.current.add(items[0]));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(4);
  });

  it("adds different items separately", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    act(() => result.current.add(items[1]));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalQty()).toBe(3);
    expect(result.current.totalPrice()).toBe(48000);
  });

  it("increments and decrements item quantity", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    act(() => result.current.inc("kopi-large"));
    expect(result.current.items[0].qty).toBe(3);

    act(() => result.current.dec("kopi-large"));
    expect(result.current.items[0].qty).toBe(2);
  });

  it("reconcile drops items whose product no longer exists", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    act(() => result.current.add(items[1]));
    expect(result.current.items).toHaveLength(2);

    act(() => result.current.reconcile(["product-1"]));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("product-1");
  });

  it("reconcile keeps state identity when nothing removed", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    const before = result.current.items;

    act(() => result.current.reconcile(["product-1", "product-2"]));

    expect(result.current.items).toBe(before);
  });

  it("removes item when dec reaches zero", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add({ ...items[0], qty: 1 }));
    act(() => result.current.dec("kopi-large"));

    expect(result.current.items).toHaveLength(0);
  });

  it("removes item by key", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    act(() => result.current.add(items[1]));
    act(() => result.current.remove("kopi-large"));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].key).toBe("roti");
  });

  it("clears all items", () => {
    const { result } = renderHook(() => useCart());

    act(() => result.current.add(items[0]));
    act(() => result.current.add(items[1]));
    act(() => result.current.clear());

    expect(result.current.items).toHaveLength(0);
  });
});
