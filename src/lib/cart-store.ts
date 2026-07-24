import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

export type CartState = {
  tenantSlug: string;
  items: CartItem[];
  setTenantSlug: (tenantSlug: string) => void;
  add: (item: CartItem) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
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
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0),
    }),
    {
      name: "tokolink-cart",
    },
  ),
);
