import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CartItemRow } from "./cart-item-row";
import type { CartItem } from "@/lib/types";

const item: CartItem = {
  key: "kopi-small",
  productId: "product-1",
  productName: "Kopi Susu",
  variantId: "small",
  variantName: "Small",
  unitPrice: 10000,
  qty: 2,
  image: "",
};

describe("CartItemRow", () => {
  it("renders product name, variant, price, and qty", () => {
    render(<CartItemRow item={item} onInc={vi.fn()} onDec={vi.fn()} />);

    expect(screen.getByText("Kopi Susu")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Rp 10.000")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onInc when the plus button is clicked", () => {
    const onInc = vi.fn();
    render(<CartItemRow item={item} onInc={onInc} onDec={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tambah Kopi Susu" }));

    expect(onInc).toHaveBeenCalledWith("kopi-small");
  });

  it("calls onDec when the minus button is clicked", () => {
    const onDec = vi.fn();
    render(<CartItemRow item={item} onInc={vi.fn()} onDec={onDec} />);

    fireEvent.click(screen.getByRole("button", { name: "Kurangi Kopi Susu" }));

    expect(onDec).toHaveBeenCalledWith("kopi-small");
  });
});
