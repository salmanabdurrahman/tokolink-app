import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CategoryManager } from "./category-manager";
import type { ProductCategory } from "../../lib/types";

const categories: ProductCategory[] = [
  { id: "cat-1", name: "Kopi", sortOrder: 0 },
  { id: "cat-2", name: "Merchandise", sortOrder: 1 },
];

describe("CategoryManager", () => {
  it("renders existing categories", () => {
    render(
      <CategoryManager
        categories={categories}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onRemove={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Kopi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Merchandise")).toBeInTheDocument();
  });

  it("submits new category name via onAdd and clears the input", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <CategoryManager
        categories={categories}
        onAdd={onAdd}
        onRename={vi.fn()}
        onRemove={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Nama kategori (mis. Minuman)"), {
      target: { value: "Minuman" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Tambah" }));

    await vi.waitFor(() => expect(onAdd).toHaveBeenCalledWith({ name: "Minuman" }));
  });

  it("shows a validation error and does not call onAdd for an empty name", () => {
    const onAdd = vi.fn();
    render(
      <CategoryManager
        categories={categories}
        onAdd={onAdd}
        onRename={vi.fn()}
        onRemove={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Tambah" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("Nama kategori harus diisi")).toBeInTheDocument();
  });

  it("calls onRename when a category name input loses focus with a changed value", () => {
    const onRename = vi.fn();
    render(
      <CategoryManager
        categories={categories}
        onAdd={vi.fn()}
        onRename={onRename}
        onRemove={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    const input = screen.getByDisplayValue("Kopi");
    fireEvent.change(input, { target: { value: "Kopi & Espresso" } });
    fireEvent.blur(input);

    expect(onRename).toHaveBeenCalledWith("cat-1", "Kopi & Espresso");
  });

  it("calls onRemove when the delete button is clicked", () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(
      <CategoryManager
        categories={categories}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onRemove={onRemove}
        onReorder={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Hapus" })[0]);

    expect(onRemove).toHaveBeenCalledWith("cat-1");
  });
});
