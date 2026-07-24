import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useCart } from "../../lib/store";
import { VariantSheet } from "./variant-sheet";

const product = {
  id: "product-1",
  name: "Kopi Susu",
  description: "",
  basePrice: 10000,
  image: "",
  variantGroups: [
    {
      id: "group-1",
      name: "Ukuran",
      options: [
        { id: "small", name: "Small", priceDelta: 0 },
        { id: "large", name: "Large", priceDelta: 2000 },
      ],
    },
  ],
};

describe("VariantSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.setState({ items: [], tenantSlug: undefined });
  });

  it("selects variant option and adds priced item to cart", () => {
    const onClose = vi.fn();
    render(<VariantSheet product={product} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Large/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tambah ke keranjang/ }));

    expect(useCart.getState().items).toEqual([
      expect.objectContaining({
        productId: "product-1",
        productName: "Kopi Susu",
        variantId: "large",
        variantName: "Large",
        unitPrice: 12000,
        qty: 1,
      }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });
});
