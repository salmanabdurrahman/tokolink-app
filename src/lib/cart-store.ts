import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

// Fresh snapshot of a still-available product used to reconcile persisted cart
// items against the current catalog: drop items whose product/variant options
// no longer exist and refresh unitPrice from the current base + deltas.
export type CartReconcileProduct = {
  id: string;
  basePrice: number;
  options: { id: string; priceDelta: number }[];
};

export type CartState = {
  tenantSlug: string;
  items: CartItem[];
  setTenantSlug: (tenantSlug: string) => void;
  add: (item: CartItem) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  reconcile: (products: CartReconcileProduct[]) => void;
  clear: () => void;
  totalQty: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      tenantSlug: "",
      items: [],
      setTenantSlug: (tenantSlug) =>
        set((s) => ({
          tenantSlug,
          items: s.tenantSlug && s.tenantSlug !== tenantSlug ? [] : s.items,
        })),
      add: (item) =>
        set((s) => {
          const found = s.items.find((i) => i.key === item.key);
          if (found) {
            return {
              items: s.items.map((i) => (i.key === item.key ? { ...i, qty: i.qty + item.qty } : i)),
            };
          }
          return { items: [...s.items, item] };
        }),
      inc: (key) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i)) })),
      dec: (key) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.key === key ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      reconcile: (products) =>
        set((s) => {
          const byId = new Map(products.map((p) => [p.id, p]));
          let changed = false;
          const next: CartItem[] = [];
          for (const item of s.items) {
            const product = byId.get(item.productId);
            // Product removed/reseeded since it was added -> drop it.
            if (!product) {
              changed = true;
              continue;
            }
            const optionIds = item.variantId ? item.variantId.split(",").filter(Boolean) : [];
            const optionById = new Map(product.options.map((o) => [o.id, o]));
            // A selected variant option was deleted -> drop the item so checkout
            // can't get permanently stuck on "Varian tidak valid".
            if (!optionIds.every((id) => optionById.has(id))) {
              changed = true;
              continue;
            }
            const freshUnitPrice = optionIds.reduce(
              (sum, id) => sum + (optionById.get(id)?.priceDelta ?? 0),
              product.basePrice,
            );
            if (freshUnitPrice !== item.unitPrice) {
              changed = true;
              next.push({ ...item, unitPrice: freshUnitPrice });
            } else {
              next.push(item);
            }
          }
          return changed ? { items: next } : s;
        }),
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0),
    }),
    {
      name: "tokolink-cart",
    },
  ),
);
