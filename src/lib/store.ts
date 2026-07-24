import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, LinkItem, Product, Tenant } from "./types";

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

import { updateTenant } from "../server/tenant.functions";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
} from "../server/product.functions";
import { addLink, updateLink, deleteLink, reorderLinks } from "../server/link.functions";

type TenantState = {
  tenant: Tenant | null;
  setTenant: (t: Tenant | null) => void;
  updateSettings: (t: Partial<Tenant>) => Promise<void>;
  addLink: (l: Omit<LinkItem, "id">) => Promise<void>;
  updateLink: (id: string, l: Partial<LinkItem>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  reorderLinks: (ids: string[]) => Promise<void>;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  reorderProducts: (ids: string[]) => Promise<void>;
};

export const useTenant = create<TenantState>((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
  updateSettings: async (t) => {
    const previous = useTenant.getState().tenant;
    if (previous) {
      set({ tenant: { ...previous, ...t } });
    }
    try {
      const updated = await updateTenant({ data: t });
      set((s) => ({ tenant: s.tenant ? { ...s.tenant, ...updated } : (updated as any) }));
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  addLink: async (l) => {
    const newLink = await addLink({ data: l });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          links: [...s.tenant.links, newLink],
        },
      };
    });
  },
  updateLink: async (id, l) => {
    const previous = useTenant.getState().tenant;
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          links: s.tenant.links.map((x) => (x.id === id ? { ...x, ...l } : x)),
        },
      };
    });
    try {
      const updated = await updateLink({ data: { id, data: l } });
      set((s) => {
        if (!s.tenant) return {};
        return {
          tenant: {
            ...s.tenant,
            links: s.tenant.links.map((x) => (x.id === id ? updated : x)),
          },
        };
      });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  removeLink: async (id) => {
    const previous = useTenant.getState().tenant;
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          links: s.tenant.links.filter((x) => x.id !== id),
        },
      };
    });
    try {
      await deleteLink({ data: id });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  reorderLinks: async (ids) => {
    const previous = useTenant.getState().tenant;
    set((s) => {
      if (!s.tenant) return {};
      const byId = new Map(s.tenant.links.map((link) => [link.id, link]));
      const links = ids.reduce<LinkItem[]>((result, id, index) => {
        const link = byId.get(id);
        if (link) result.push({ ...link, sortOrder: index });
        return result;
      }, []);
      return {
        tenant: {
          ...s.tenant,
          links,
        },
      };
    });
    try {
      await reorderLinks({ data: ids });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  addProduct: async (p) => {
    const newProduct = await createProduct({ data: p });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          products: [...s.tenant.products, newProduct as any],
        },
      };
    });
  },
  updateProduct: async (id, p) => {
    const previous = useTenant.getState().tenant;
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          products: s.tenant.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
        },
      };
    });
    try {
      const updated = await updateProduct({ data: { id, data: p } });
      set((s) => {
        if (!s.tenant) return {};
        return {
          tenant: {
            ...s.tenant,
            products: s.tenant.products.map((x) => (x.id === id ? (updated as any) : x)),
          },
        };
      });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  removeProduct: async (id) => {
    const previous = useTenant.getState().tenant;
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          products: s.tenant.products.filter((x) => x.id !== id),
        },
      };
    });
    try {
      await deleteProduct({ data: id });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  reorderProducts: async (ids) => {
    const previous = useTenant.getState().tenant;
    set((s) => {
      if (!s.tenant) return {};
      const byId = new Map(s.tenant.products.map((product) => [product.id, product]));
      const products = ids.reduce<Product[]>((result, id, index) => {
        const product = byId.get(id);
        if (product) result.push({ ...product, sortOrder: index });
        return result;
      }, []);
      return {
        tenant: {
          ...s.tenant,
          products,
        },
      };
    });
    try {
      await reorderProducts({ data: ids });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
}));

type CartState = {
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

export function buildWhatsAppUrl(
  phone: string,
  storeName: string,
  items: CartItem[],
  total: number,
  note?: string,
  template?: string,
) {
  const defaultIntro = `Halo *${storeName}*, saya mau order pesanan berikut ya:\n`;
  const lines = [
    template?.trim() || defaultIntro,
    ...items.map((i) => {
      const priceFormatted = (i.unitPrice * i.qty).toLocaleString("id-ID");
      const variantText = i.variantName ? ` (${i.variantName})` : "";
      return `▪ ${i.qty}x ${i.productName}${variantText}\n  Rp${priceFormatted}`;
    }),
    "",
    note ? `*Catatan:*\n${note}\n` : "",
    `*Total Pesanan: Rp${total.toLocaleString("id-ID")}*\n`,
    template?.trim() ? "" : `Mohon info instruksi pembayarannya ya. Terima kasih! 🙏`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
