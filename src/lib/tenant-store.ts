import { create } from "zustand";
import type { LinkItem, Product, Tenant } from "./types";

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
    if (previous) set({ tenant: { ...previous, ...t } });
    try {
      const { updateTenant } = await import("../server/tenant.functions");
      const updated = await updateTenant({ data: t });
      set((s) => ({ tenant: s.tenant ? { ...s.tenant, ...updated } : (updated as any) }));
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  addLink: async (l) => {
    const { addLink } = await import("../server/link.functions");
    const newLink = await addLink({ data: l });
    set((s) => (s.tenant ? { tenant: { ...s.tenant, links: [...s.tenant.links, newLink] } } : {}));
  },
  updateLink: async (id, l) => {
    const previous = useTenant.getState().tenant;
    set((s) =>
      s.tenant
        ? {
            tenant: {
              ...s.tenant,
              links: s.tenant.links.map((x) => (x.id === id ? { ...x, ...l } : x)),
            },
          }
        : {},
    );
    try {
      const { updateLink } = await import("../server/link.functions");
      const updated = await updateLink({ data: { id, data: l } });
      set((s) =>
        s.tenant
          ? {
              tenant: {
                ...s.tenant,
                links: s.tenant.links.map((x) => (x.id === id ? updated : x)),
              },
            }
          : {},
      );
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  removeLink: async (id) => {
    const previous = useTenant.getState().tenant;
    set((s) =>
      s.tenant ? { tenant: { ...s.tenant, links: s.tenant.links.filter((x) => x.id !== id) } } : {},
    );
    try {
      const { deleteLink } = await import("../server/link.functions");
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
      return { tenant: { ...s.tenant, links } };
    });
    try {
      const { reorderLinks } = await import("../server/link.functions");
      await reorderLinks({ data: ids });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  addProduct: async (p) => {
    const { createProduct } = await import("../server/product.functions");
    const newProduct = await createProduct({ data: p });
    set((s) =>
      s.tenant
        ? { tenant: { ...s.tenant, products: [...s.tenant.products, newProduct as any] } }
        : {},
    );
  },
  updateProduct: async (id, p) => {
    const previous = useTenant.getState().tenant;
    set((s) =>
      s.tenant
        ? {
            tenant: {
              ...s.tenant,
              products: s.tenant.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
            },
          }
        : {},
    );
    try {
      const { updateProduct } = await import("../server/product.functions");
      const updated = await updateProduct({ data: { id, data: p } });
      set((s) =>
        s.tenant
          ? {
              tenant: {
                ...s.tenant,
                products: s.tenant.products.map((x) => (x.id === id ? (updated as any) : x)),
              },
            }
          : {},
      );
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
  removeProduct: async (id) => {
    const previous = useTenant.getState().tenant;
    set((s) =>
      s.tenant
        ? { tenant: { ...s.tenant, products: s.tenant.products.filter((x) => x.id !== id) } }
        : {},
    );
    try {
      const { deleteProduct } = await import("../server/product.functions");
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
      return { tenant: { ...s.tenant, products } };
    });
    try {
      const { reorderProducts } = await import("../server/product.functions");
      await reorderProducts({ data: ids });
    } catch (error) {
      set({ tenant: previous });
      throw error;
    }
  },
}));
