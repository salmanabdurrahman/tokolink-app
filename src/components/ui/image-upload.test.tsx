import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/image-utils", () => ({
  validateImage: vi.fn(),
  compressToWebP: vi.fn(),
}));

vi.mock("@/server/upload.functions", () => ({
  uploadImage: vi.fn(),
}));

import { compressToWebP, validateImage } from "@/lib/image-utils";
import { uploadImage } from "@/server/upload.functions";
import { ImageUpload } from "./image-upload";

function makeFile(name = "photo.png", type = "image/png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe("ImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state without value", () => {
    render(<ImageUpload onChange={vi.fn()} />);

    expect(screen.getByText("Drag & drop gambar di sini")).toBeInTheDocument();
    expect(screen.getByText("JPEG, PNG, WebP atau GIF up to 5MB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pilih gambar" })).toBeInTheDocument();
  });

  it("renders preview state when value provided", () => {
    render(<ImageUpload value="https://cdn.example.com/foto.webp" onChange={vi.fn()} />);

    const img = screen.getByAltText("Pratinjau gambar") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/foto.webp");
    expect(screen.getByRole("button", { name: "Ganti gambar" })).toBeInTheDocument();
    expect(screen.queryByText("Drag & drop gambar di sini")).not.toBeInTheDocument();
  });

  it("uploads a valid file and calls onChange with resulting URL", async () => {
    vi.mocked(validateImage).mockResolvedValue({ valid: true });
    vi.mocked(compressToWebP).mockResolvedValue(new Blob(["webp"], { type: "image/webp" }));
    vi.mocked(uploadImage).mockResolvedValue({
      url: "https://cdn.example.com/uploaded.webp",
      key: "key",
    } as any);
    const onChange = vi.fn();

    const { container } = render(<ImageUpload onChange={onChange} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, makeFile());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/uploaded.webp"));
    expect(validateImage).toHaveBeenCalled();
    expect(compressToWebP).toHaveBeenCalled();
    expect(uploadImage).toHaveBeenCalled();
  });

  it("shows loading status while uploading", async () => {
    let resolveValidate: (v: { valid: boolean }) => void = () => {};
    vi.mocked(validateImage).mockReturnValue(
      new Promise((resolve) => {
        resolveValidate = resolve;
      }),
    );
    const onChange = vi.fn();

    const { container } = render(<ImageUpload onChange={onChange} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, makeFile());

    expect(screen.getByText("Memvalidasi gambar...")).toBeInTheDocument();
    expect(input).toBeDisabled();

    resolveValidate({ valid: false });
    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it("shows error message and retry button when validation fails", async () => {
    vi.mocked(validateImage).mockResolvedValue({
      valid: false,
      error: "Format gambar harus JPEG, PNG, WebP, atau GIF",
    });
    const onChange = vi.fn();

    const { container } = render(<ImageUpload onChange={onChange} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, makeFile());

    expect(await screen.findByText("Format gambar harus JPEG, PNG, WebP, atau GIF")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    const retryButton = screen.getByRole("button", { name: "Coba lagi" });
    vi.mocked(validateImage).mockResolvedValue({ valid: true });
    vi.mocked(compressToWebP).mockResolvedValue(new Blob(["webp"], { type: "image/webp" }));
    vi.mocked(uploadImage).mockResolvedValue({ url: "https://cdn.example.com/retry.webp", key: "k" } as any);

    fireEvent.click(retryButton);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/retry.webp"));
  });

  it("shows server error message when upload fails", async () => {
    vi.mocked(validateImage).mockResolvedValue({ valid: true });
    vi.mocked(compressToWebP).mockResolvedValue(new Blob(["webp"], { type: "image/webp" }));
    vi.mocked(uploadImage).mockRejectedValue(new Error("Gagal mengunggah gambar ke CDN"));

    const { container } = render(<ImageUpload onChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, makeFile());

    expect(await screen.findByText("Gagal mengunggah gambar ke CDN")).toBeInTheDocument();
  });

  it("opens the native file picker when the select-image button is clicked", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    render(<ImageUpload onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pilih gambar" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  it("opens the native file picker when the replace-image button is clicked", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    render(<ImageUpload value="https://cdn.example.com/foto.webp" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ganti gambar" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  it("toggles drag active styling on drag events", () => {
    const { container } = render(<ImageUpload onChange={vi.fn()} />);
    const dropzone = container.querySelector("div.relative") as HTMLElement;

    fireEvent.dragEnter(dropzone);
    expect(dropzone.className).toContain("border-accent");

    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toContain("border-accent");
  });

  it("uploads a dropped file via drag and drop", async () => {
    vi.mocked(validateImage).mockResolvedValue({ valid: true });
    vi.mocked(compressToWebP).mockResolvedValue(new Blob(["webp"], { type: "image/webp" }));
    vi.mocked(uploadImage).mockResolvedValue({
      url: "https://cdn.example.com/dropped.webp",
      key: "key",
    } as any);
    const onChange = vi.fn();

    const { container } = render(<ImageUpload onChange={onChange} />);
    const dropzone = container.querySelector("div.relative") as HTMLElement;

    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile()] } });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/dropped.webp"),
    );
  });
});
