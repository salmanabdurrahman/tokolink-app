import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, LinkItem, Product, Tenant } from "./types";
import { demoTenant } from "./mock-data";

// ---------- Auth ----------
type AuthState = {
  user: any | null;
  isLoading: boolean;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: async () => {
    const { supabase } = await import("./supabase");
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

// ---------- Tenant (mock) ----------
type TenantState = {
  tenant: Tenant;
  setTenant: (t: Partial<Tenant>) => void;
  addLink: (l: Omit<LinkItem, "id">) => void;
  updateLink: (id: string, l: Partial<LinkItem>) => void;
  removeLink: (id: string) => void;
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  removeProduct: (id: string) => void;
};

export const useTenant = create<TenantState>()(
  persist(
    (set) => ({
      tenant: demoTenant,
      setTenant: (t) => set((s) => ({ tenant: { ...s.tenant, ...t } })),
      addLink: (l) =>
        set((s) => ({
          tenant: { ...s.tenant, links: [...s.tenant.links, { ...l, id: crypto.randomUUID() }] },
        })),
      updateLink: (id, l) =>
        set((s) => ({
          tenant: {
            ...s.tenant,
            links: s.tenant.links.map((x) => (x.id === id ? { ...x, ...l } : x)),
          },
        })),
      removeLink: (id) =>
        set((s) => ({
          tenant: { ...s.tenant, links: s.tenant.links.filter((x) => x.id !== id) },
        })),
      addProduct: (p) =>
        set((s) => ({
          tenant: {
            ...s.tenant,
            products: [...s.tenant.products, { ...p, id: crypto.randomUUID() }],
          },
        })),
      updateProduct: (id, p) =>
        set((s) => ({
          tenant: {
            ...s.tenant,
            products: s.tenant.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
          },
        })),
      removeProduct: (id) =>
        set((s) => ({
          tenant: { ...s.tenant, products: s.tenant.products.filter((x) => x.id !== id) },
        })),
    }),
    { name: "tokolink-tenant" },
  ),
);

// ---------- Cart (per session, not persisted) ----------
type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  totalQty: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],
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
}));

export function buildWhatsAppUrl(
  phone: string,
  storeName: string,
  items: CartItem[],
  total: number,
  note?: string,
) {
  const lines = [
    `*🛒 PESANAN BARU - ${storeName.toUpperCase()}*`,
    `----------------------------------------`,
    `Halo ${storeName}, saya ingin memesan produk berikut:`,
    "",
    ...items.map((i, idx) => {
      const priceFormatted = (i.unitPrice * i.qty).toLocaleString("id-ID");
      const unitPriceFormatted = i.unitPrice.toLocaleString("id-ID");
      const variantText = i.variantName ? `\n   └─ _Pilihan: ${i.variantName}_` : "";
      return `*${idx + 1}. ${i.productName}* (${i.qty}x)${variantText}\n   Harga: Rp${unitPriceFormatted} → *Rp${priceFormatted}*`;
    }),
    "",
    `----------------------------------------`,
    note ? `*📝 Catatan Tambahan:*\n"${note}"\n` : "",
    `*💵 Total Pembayaran: Rp${total.toLocaleString("id-ID")}*`,
    `----------------------------------------`,
    `Mohon konfirmasi ketersediaan stok & metode pembayaran. Terima kasih! 🙏`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
