import type React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: "div",
  },
}));

vi.mock("@/lib/image-utils", () => ({
  validateImage: vi.fn(async () => ({ valid: true })),
  compressToWebP: vi.fn(async () => new Blob(["webp"], { type: "image/webp" })),
}));

vi.mock("@/server/upload.functions", () => ({
  uploadImage: vi.fn(async () => ({ url: "https://media.example.com/uploaded.webp", key: "k" })),
}));

import { uploadImage } from "@/server/upload.functions";
import { ProductForm } from "./product-form";
import type { Product } from "../../lib/types";

const initialProduct: Product = {
  id: "product-1",
  name: "Kopi Susu",
  description: "Kopi susu gula aren",
  basePrice: 15000,
  image: "https://media.example.com/kopi.webp",
  variantGroups: [
    {
      id: "group-1",
      name: "Ukuran",
      options: [{ id: "opt-1", name: "Small", priceDelta: 0 }],
    },
  ],
};

function fillRequiredFields(name = "Kopi Baru", price = "20000") {
  fireEvent.change(screen.getByLabelText("Nama"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Harga dasar (Rp)"), { target: { value: price } });
}

function submitForm(container: HTMLElement) {
  fireEvent.submit(container.querySelector("form") as HTMLFormElement);
}

describe("ProductForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode heading and empty fields for a new product", () => {
    render(<ProductForm initial={null} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText("Produk baru")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambah produk" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama")).toHaveValue("");
  });

  it("renders edit mode heading and pre-fills fields from the initial product", () => {
    render(<ProductForm initial={initialProduct} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText("Edit produk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan perubahan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama")).toHaveValue("Kopi Susu");
    expect(screen.getByLabelText("Deskripsi")).toHaveValue("Kopi susu gula aren");
    expect(screen.getByLabelText("Harga dasar (Rp)")).toHaveValue(15000);
    expect(screen.getByDisplayValue("Ukuran")).toBeInTheDocument();
  });

  it("converts basePrice to a number and submits parsed data", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fillRequiredFields("Kopi Baru", "20000");
    submitForm(container);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Kopi Baru");
    expect(submitted.basePrice).toBe(20000);
    expect(typeof submitted.basePrice).toBe("number");
  });

  it("falls back to the default product image when no image is provided", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fillRequiredFields();
    submitForm(container);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].image).toBe(
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    );
  });

  it("shows a validation error and does not submit when name is missing", async () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText("Harga dasar (Rp)"), { target: { value: "20000" } });
    submitForm(container);

    expect(await screen.findByText("Nama produk harus diisi")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when a variant group has no options", async () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "+ Tipe varian" }));
    fireEvent.change(screen.getByPlaceholderText("Contoh: Ukuran, Warna, Gilingan"), {
      target: { value: "Ukuran" },
    });
    submitForm(container);

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("adds a variant group with an option and submits it", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "+ Tipe varian" }));
    fireEvent.change(screen.getByPlaceholderText("Contoh: Ukuran, Warna, Gilingan"), {
      target: { value: "Ukuran" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Tambah pilihan" }));
    fireEvent.change(screen.getByPlaceholderText("Pilihan (mis. M, Merah, Biji)"), {
      target: { value: "Large" },
    });
    fireEvent.change(screen.getByPlaceholderText("+Harga (Rp)"), { target: { value: "3000" } });

    submitForm(container);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.variantGroups).toEqual([
      expect.objectContaining({
        name: "Ukuran",
        options: [expect.objectContaining({ name: "Large", priceDelta: 3000 })],
      }),
    ]);
  });

  it("removes a variant option from a group", () => {
    render(<ProductForm initial={initialProduct} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByDisplayValue("Small")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus pilihan" }));

    expect(screen.queryByDisplayValue("Small")).not.toBeInTheDocument();
  });

  it("removes a variant group entirely", () => {
    render(<ProductForm initial={initialProduct} onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Hapus grup" }));

    expect(screen.queryByText("Ukuran")).not.toBeInTheDocument();
    expect(screen.getByText(/Belum ada tipe varian/)).toBeInTheDocument();
  });

  it("uploads an image through ImageUpload and submits the resulting URL", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fillRequiredFields();

    const file = new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
    await screen.findByAltText("Pratinjau gambar");

    submitForm(container);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].image).toBe("https://media.example.com/uploaded.webp");
  });

  it("disables the submit button and shows a saving label while awaiting onSubmit", async () => {
    let resolveSubmit: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const { container } = render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fillRequiredFields();
    submitForm(container);

    expect(await screen.findByRole("button", { name: "Menyimpan..." })).toBeDisabled();

    resolveSubmit();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Tambah produk" })).toBeEnabled(),
    );
  });

  it("closes immediately without confirmation when the form is not dirty", () => {
    const onClose = vi.fn();
    render(<ProductForm initial={initialProduct} onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tutup form" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Tutup form?")).not.toBeInTheDocument();
  });

  it("asks for confirmation before closing a dirty form, and cancel does not discard changes", () => {
    const onClose = vi.fn();
    render(<ProductForm initial={initialProduct} onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Susu Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Tutup form" }));

    expect(screen.getByText("Tutup form?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));

    // The confirmation modal is nested inside the overlay that also triggers
    // closeForm on click, so cancelling never calls onClose here either way.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("updates the description field when edited", () => {
    render(<ProductForm initial={null} onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Deskripsi"), {
      target: { value: "Kopi susu gula aren dingin" },
    });

    expect(screen.getByLabelText("Deskripsi")).toHaveValue("Kopi susu gula aren dingin");
  });

  it("prevents the tab from closing when the form is dirty", () => {
    render(<ProductForm initial={initialProduct} onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Susu Baru" } });

    const event = fireEvent(window, new Event("beforeunload", { cancelable: true }));

    expect(event).toBe(false);
  });

  it("does not prevent the tab from closing when the form is not dirty", () => {
    render(<ProductForm initial={initialProduct} onClose={vi.fn()} onSubmit={vi.fn()} />);

    const event = fireEvent(window, new Event("beforeunload", { cancelable: true }));

    expect(event).toBe(true);
  });

  it("does not render the AI copy button when onGenerateCopy is not provided", () => {
    render(<ProductForm initial={null} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Buatkan deskripsi (AI)" }),
    ).not.toBeInTheDocument();
  });

  it("disables the AI copy button until a product name is filled in", () => {
    render(
      <ProductForm initial={null} onClose={vi.fn()} onSubmit={vi.fn()} onGenerateCopy={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Buatkan deskripsi (AI)" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Arabika" } });
    expect(screen.getByRole("button", { name: "Buatkan deskripsi (AI)" })).toBeEnabled();
  });

  it("fills description and shows variant suggestions from AI on success", async () => {
    const onGenerateCopy = vi.fn().mockResolvedValue({
      description: "Kopi arabika single origin, aroma kuat.",
      variantSuggestions: ["250g", "500g"],
    });
    render(
      <ProductForm
        initial={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onGenerateCopy={onGenerateCopy}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Arabika" } });
    fireEvent.change(screen.getByPlaceholderText("Kata kunci untuk AI (opsional, pisah koma)"), {
      target: { value: "gayo, single origin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buatkan deskripsi (AI)" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Deskripsi")).toHaveValue(
        "Kopi arabika single origin, aroma kuat.",
      ),
    );
    expect(onGenerateCopy).toHaveBeenCalledWith({
      name: "Kopi Arabika",
      keywords: "gayo, single origin",
      categoryName: "",
    });
    expect(await screen.findByText("Saran varian dari AI: 250g, 500g")).toBeInTheDocument();
  });

  it("shows an error toast and keeps the description unchanged when AI generation fails", async () => {
    const onGenerateCopy = vi.fn().mockRejectedValue(new Error("AI terlalu lama merespons."));
    render(
      <ProductForm
        initial={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onGenerateCopy={onGenerateCopy}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Arabika" } });
    fireEvent.click(screen.getByRole("button", { name: "Buatkan deskripsi (AI)" }));

    await waitFor(() => expect(onGenerateCopy).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Deskripsi")).toHaveValue("");
  });

  it("closes the confirmation modal without discarding changes when dismissed via Escape", () => {
    const onClose = vi.fn();
    render(<ProductForm initial={initialProduct} onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Susu Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Tutup form" }));

    expect(screen.getByText("Tutup form?")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText("Tutup form?")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nama")).toHaveValue("Kopi Susu Baru");
  });

  it("closes a dirty form without saving when the confirmation is accepted", () => {
    const onClose = vi.fn();
    render(<ProductForm initial={initialProduct} onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kopi Susu Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Tutup form" }));
    fireEvent.click(screen.getByRole("button", { name: "Tutup tanpa menyimpan" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
