import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Tenant } from "./types";

const updateTenantMock = vi.fn();
const addLinkMock = vi.fn();
const updateLinkMock = vi.fn();
const deleteLinkMock = vi.fn();
const reorderLinksMock = vi.fn();
const createProductMock = vi.fn();
const updateProductMock = vi.fn();
const deleteProductMock = vi.fn();
const reorderProductsMock = vi.fn();

vi.mock("../server/tenant.functions", () => ({ updateTenant: updateTenantMock }));
vi.mock("../server/link.functions", () => ({
  addLink: addLinkMock,
  updateLink: updateLinkMock,
  deleteLink: deleteLinkMock,
  reorderLinks: reorderLinksMock,
}));
vi.mock("../server/product.functions", () => ({
  createProduct: createProductMock,
  updateProduct: updateProductMock,
  deleteProduct: deleteProductMock,
  reorderProducts: reorderProductsMock,
}));

import { useTenant } from "./tenant-store";

const tenant: Tenant = {
  slug: "kopi-ibu",
  name: "Kopi Ibu",
  tagline: "Kopi rumahan",
  avatar: "",
  whatsapp: "6281234567890",
  links: [
    { id: "link-1", label: "Instagram", url: "https://instagram.com/kopi", sortOrder: 0 },
    { id: "link-2", label: "Website", url: "https://kopi.test", sortOrder: 1 },
  ],
  products: [
    {
      id: "product-1",
      name: "Kopi Susu",
      description: "Manis",
      basePrice: 18000,
      image: "",
      sortOrder: 0,
    },
    {
      id: "product-2",
      name: "Roti",
      description: "Coklat",
      basePrice: 12000,
      image: "",
      sortOrder: 1,
    },
  ],
  categories: [],
};

const resetTenant = () => {
  act(() => {
    useTenant.getState().setTenant(structuredClone(tenant));
  });
};

describe("useTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTenant();
  });

  afterEach(() => {
    act(() => {
      useTenant.getState().setTenant(null);
    });
  });

  it("sets tenant data", () => {
    act(() => useTenant.getState().setTenant(null));

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("optimistically updates settings and merges server result", async () => {
    updateTenantMock.mockResolvedValue({ name: "Kopi Baru", tagline: "Segar" });
    await act(async () => {
      await useTenant.getState().updateSettings({ name: "Kopi Baru" });
    });

    expect(updateTenantMock).toHaveBeenCalledWith({ data: { name: "Kopi Baru" } });
    expect(useTenant.getState().tenant).toMatchObject({ name: "Kopi Baru", tagline: "Segar" });
  });

  it("rolls back settings when server update fails", async () => {
    updateTenantMock.mockRejectedValue(new Error("db failed"));
    await expect(
      act(async () => {
        await useTenant.getState().updateSettings({ name: "Gagal" });
      }),
    ).rejects.toThrow("db failed");

    expect(useTenant.getState().tenant?.name).toBe("Kopi Ibu");
  });

  it("adds, updates, removes, and reorders links", async () => {
    addLinkMock.mockResolvedValue({
      id: "link-3",
      label: "TikTok",
      url: "https://tiktok.com/kopi",
      sortOrder: 2,
    });
    updateLinkMock.mockResolvedValue({
      id: "link-1",
      label: "IG",
      url: "https://instagram.com/kopi",
      sortOrder: 0,
    });
    deleteLinkMock.mockResolvedValue(undefined);
    reorderLinksMock.mockResolvedValue(undefined);
    await act(async () => {
      await useTenant
        .getState()
        .addLink({ label: "TikTok", url: "https://tiktok.com/kopi", sortOrder: 2 });
      await useTenant.getState().updateLink("link-1", { label: "IG" });
      await useTenant.getState().removeLink("link-2");
      await useTenant.getState().reorderLinks(["link-3", "link-1"]);
    });

    expect(useTenant.getState().tenant?.links.map((link) => [link.id, link.sortOrder])).toEqual([
      ["link-3", 0],
      ["link-1", 1],
    ]);
    expect(reorderLinksMock).toHaveBeenCalledWith({ data: ["link-3", "link-1"] });
  });

  it("rolls back link mutation failures", async () => {
    updateLinkMock.mockRejectedValue(new Error("link failed"));
    await expect(
      act(async () => {
        await useTenant.getState().updateLink("link-1", { label: "Gagal" });
      }),
    ).rejects.toThrow("link failed");

    expect(useTenant.getState().tenant?.links[0].label).toBe("Instagram");
  });

  it("adds, updates, removes, and reorders products", async () => {
    createProductMock.mockResolvedValue({
      id: "product-3",
      name: "Teh",
      description: "Hangat",
      basePrice: 9000,
      image: "",
      sortOrder: 2,
    });
    updateProductMock.mockResolvedValue({
      id: "product-1",
      name: "Kopi Susu Aren",
      description: "Manis",
      basePrice: 20000,
      image: "",
      sortOrder: 0,
    });
    deleteProductMock.mockResolvedValue(undefined);
    reorderProductsMock.mockResolvedValue(undefined);
    await act(async () => {
      await useTenant.getState().addProduct({
        name: "Teh",
        description: "Hangat",
        basePrice: 9000,
        image: "",
        sortOrder: 2,
      });
      await useTenant.getState().updateProduct("product-1", { name: "Kopi Susu Aren" });
      await useTenant.getState().removeProduct("product-2");
      await useTenant.getState().reorderProducts(["product-3", "product-1"]);
    });

    expect(
      useTenant.getState().tenant?.products.map((product) => [product.id, product.sortOrder]),
    ).toEqual([
      ["product-3", 0],
      ["product-1", 1],
    ]);
    expect(reorderProductsMock).toHaveBeenCalledWith({ data: ["product-3", "product-1"] });
  });

  it("rolls back product mutation failures", async () => {
    deleteProductMock.mockRejectedValue(new Error("product failed"));
    await expect(
      act(async () => {
        await useTenant.getState().removeProduct("product-1");
      }),
    ).rejects.toThrow("product failed");

    expect(useTenant.getState().tenant?.products.map((product) => product.id)).toEqual([
      "product-1",
      "product-2",
    ]);
  });

  it("applies updateSettings result directly when there is no previous tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    updateTenantMock.mockResolvedValue({ name: "Baru" });

    await act(async () => {
      await useTenant.getState().updateSettings({ name: "Baru" });
    });

    expect(useTenant.getState().tenant).toEqual({ name: "Baru" });
  });

  it("addLink is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    addLinkMock.mockResolvedValue({
      id: "link-x",
      label: "X",
      url: "https://x.test",
      sortOrder: 0,
    });

    await act(async () => {
      await useTenant.getState().addLink({ label: "X", url: "https://x.test", sortOrder: 0 });
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("updateLink is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    updateLinkMock.mockResolvedValue({
      id: "link-x",
      label: "Y",
      url: "https://x.test",
      sortOrder: 0,
    });

    await act(async () => {
      await useTenant.getState().updateLink("link-x", { label: "Y" });
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("removeLink is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    deleteLinkMock.mockResolvedValue(undefined);

    await act(async () => {
      await useTenant.getState().removeLink("link-x");
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("rolls back link removal when server delete fails", async () => {
    deleteLinkMock.mockRejectedValue(new Error("delete failed"));
    await expect(
      act(async () => {
        await useTenant.getState().removeLink("link-1");
      }),
    ).rejects.toThrow("delete failed");

    expect(useTenant.getState().tenant?.links.map((link) => link.id)).toEqual(["link-1", "link-2"]);
  });

  it("reorderLinks is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    reorderLinksMock.mockResolvedValue(undefined);

    await act(async () => {
      await useTenant.getState().reorderLinks(["link-x"]);
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("reorderLinks skips ids that no longer exist", async () => {
    reorderLinksMock.mockResolvedValue(undefined);

    await act(async () => {
      await useTenant.getState().reorderLinks(["link-1", "missing-link"]);
    });

    expect(useTenant.getState().tenant?.links.map((link) => link.id)).toEqual(["link-1"]);
  });

  it("rolls back link reorder when server reorder fails", async () => {
    reorderLinksMock.mockRejectedValue(new Error("reorder failed"));
    await expect(
      act(async () => {
        await useTenant.getState().reorderLinks(["link-2", "link-1"]);
      }),
    ).rejects.toThrow("reorder failed");

    expect(useTenant.getState().tenant?.links.map((link) => link.id)).toEqual(["link-1", "link-2"]);
  });

  it("addProduct is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    createProductMock.mockResolvedValue({
      id: "product-x",
      name: "X",
      description: "",
      basePrice: 1000,
      image: "",
      sortOrder: 0,
    });

    await act(async () => {
      await useTenant.getState().addProduct({
        name: "X",
        description: "",
        basePrice: 1000,
        image: "",
        sortOrder: 0,
      });
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("updateProduct is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    updateProductMock.mockResolvedValue({
      id: "product-x",
      name: "Y",
      description: "",
      basePrice: 1000,
      image: "",
      sortOrder: 0,
    });

    await act(async () => {
      await useTenant.getState().updateProduct("product-x", { name: "Y" });
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("rolls back product update when server update fails", async () => {
    updateProductMock.mockRejectedValue(new Error("update failed"));
    await expect(
      act(async () => {
        await useTenant.getState().updateProduct("product-1", { name: "Gagal" });
      }),
    ).rejects.toThrow("update failed");

    expect(useTenant.getState().tenant?.products[0].name).toBe("Kopi Susu");
  });

  it("removeProduct is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    deleteProductMock.mockResolvedValue(undefined);

    await act(async () => {
      await useTenant.getState().removeProduct("product-x");
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("reorderProducts is a no-op when there is no tenant", async () => {
    act(() => useTenant.getState().setTenant(null));
    reorderProductsMock.mockResolvedValue(undefined);

    await act(async () => {
      await useTenant.getState().reorderProducts(["product-x"]);
    });

    expect(useTenant.getState().tenant).toBeNull();
  });

  it("reorderProducts skips ids that no longer exist", async () => {
    reorderProductsMock.mockResolvedValue(undefined);

    await act(async () => {
      await useTenant.getState().reorderProducts(["product-1", "missing-product"]);
    });

    expect(useTenant.getState().tenant?.products.map((product) => product.id)).toEqual([
      "product-1",
    ]);
  });

  it("rolls back product reorder when server reorder fails", async () => {
    reorderProductsMock.mockRejectedValue(new Error("reorder failed"));
    await expect(
      act(async () => {
        await useTenant.getState().reorderProducts(["product-2", "product-1"]);
      }),
    ).rejects.toThrow("reorder failed");

    expect(useTenant.getState().tenant?.products.map((product) => product.id)).toEqual([
      "product-1",
      "product-2",
    ]);
  });
});
