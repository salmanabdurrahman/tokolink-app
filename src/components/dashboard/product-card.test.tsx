import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "./product-card";
import type { Product } from "../../lib/types";

const product: Product = {
  id: "product-1",
  name: "Kopi Susu",
  description: "",
  basePrice: 15000,
  image: "",
};

const productWithVariants: Product = {
  ...product,
  id: "product-2",
  name: "Kopi Gula Aren",
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

describe("ProductCard (dashboard)", () => {
  it("renders product name and formatted price", () => {
    render(<ProductCard product={product} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Kopi Susu")).toBeInTheDocument();
    expect(screen.getByText("Rp 15.000")).toBeInTheDocument();
  });

  it("renders variant group names and option summaries when present", () => {
    render(<ProductCard product={productWithVariants} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Ukuran")).toBeInTheDocument();
    expect(screen.getByText(/Small, Large/)).toBeInTheDocument();
  });

  it("does not render a variant section when the product has no variants", () => {
    render(<ProductCard product={product} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.queryByText("Ukuran")).not.toBeInTheDocument();
  });

  it("triggers onEdit when the edit button is clicked", () => {
    const onEdit = vi.fn();
    render(<ProductCard product={product} onEdit={onEdit} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("triggers onDelete when the delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<ProductCard product={product} onEdit={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows sold out badge and stock count when stock is tracked and depleted", () => {
    const soldOutProduct: Product = { ...product, trackStock: true, stock: 0 };
    render(<ProductCard product={soldOutProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Stok habis")).toBeInTheDocument();
    expect(screen.getByText("Stok: 0")).toBeInTheDocument();
  });

  it("shows category name badge when categoryName is provided", () => {
    render(
      <ProductCard product={product} categoryName="Minuman" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("Minuman")).toBeInTheDocument();
  });
});
