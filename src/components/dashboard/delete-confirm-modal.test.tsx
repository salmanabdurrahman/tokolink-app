import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteConfirmModal } from "./delete-confirm-modal";
import type { Product } from "../../lib/types";

const product: Product = {
  id: "product-1",
  name: "Kopi Susu",
  description: "",
  basePrice: 15000,
  image: "",
};

describe("DeleteConfirmModal", () => {
  it("shows the product name in the confirmation copy", () => {
    render(<DeleteConfirmModal product={product} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText("Hapus produk?")).toBeInTheDocument();
    expect(screen.getByText("Kopi Susu")).toBeInTheDocument();
  });

  it("calls onConfirm when the destructive action is clicked", () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmModal product={product} onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<DeleteConfirmModal product={product} onClose={onClose} onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the modal close button is clicked", () => {
    const onClose = vi.fn();
    render(<DeleteConfirmModal product={product} onClose={onClose} onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tutup modal" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
