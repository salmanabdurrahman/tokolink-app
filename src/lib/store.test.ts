import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "./store";
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
});
