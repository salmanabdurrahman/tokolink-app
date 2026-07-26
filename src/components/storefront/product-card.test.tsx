import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { useCart } from "../../lib/store";
import { ProductCard } from "./product-card";
import type { Product } from "../../lib/types";

const baseProduct: Product = {
  id: "product-1",
  name: "Kopi Susu",
  description: "",
  basePrice: 15000,
  image: "",
};

const variantProduct: Product = {
  ...baseProduct,
  id: "product-2",
  name: "Kopi Gula Aren",
  variantGroups: [
    {
      id: "group-1",
      name: "Ukuran",
      options: [{ id: "small", name: "Small", priceDelta: 0 }],
    },
  ],
};

describe("ProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.setState({ items: [], tenantSlug: undefined });
  });

  it("formats the base price using formatIDR", () => {
    render(<ProductCard product={baseProduct} onSelect={vi.fn()} />);

    expect(screen.getByText("Rp 15.000")).toBeInTheDocument();
  });

  it("adds product directly to cart when it has no variants", () => {
    const onSelect = vi.fn();
    render(<ProductCard product={baseProduct} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Keranjang" }));

    expect(useCart.getState().items).toEqual([
      expect.objectContaining({
        key: "product-1",
        productId: "product-1",
        productName: "Kopi Susu",
        unitPrice: 15000,
        qty: 1,
        image: "",
      }),
    ]);
    expect(toast.success).toHaveBeenCalledWith('"Kopi Susu" ditambahkan ke keranjang');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("delegates to onSelect instead of adding to cart when product has variants", () => {
    const onSelect = vi.fn();
    render(<ProductCard product={variantProduct} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Keranjang" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(useCart.getState().items).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
