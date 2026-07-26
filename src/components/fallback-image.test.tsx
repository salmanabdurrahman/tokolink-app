import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FallbackImage } from "./fallback-image";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FallbackImage", () => {
  it("renders the image when src is provided", () => {
    render(<FallbackImage src="https://cdn.example.com/foto.webp" alt="Kopi Susu" />);

    const img = screen.getByAltText("Kopi Susu") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/foto.webp");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("renders fallback initials immediately when src is missing", () => {
    render(<FallbackImage alt="Kopi Susu" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("KS")).toBeInTheDocument();
  });

  it("falls back to initials when the image fails to load", () => {
    render(<FallbackImage src="https://cdn.example.com/broken.webp" alt="Kopi Susu" />);

    const img = screen.getByAltText("Kopi Susu");
    fireEvent.error(img);

    expect(screen.queryByAltText("Kopi Susu")).not.toBeInTheDocument();
    expect(screen.getByText("KS")).toBeInTheDocument();
  });

  it("uses fallbackText for initials when provided", () => {
    render(<FallbackImage alt="Kopi Susu" fallbackText="Toko Ibu Sari" />);

    expect(screen.getByText("TI")).toBeInTheDocument();
  });

  it("renders a generic icon when neither fallbackText nor alt yields initials", () => {
    const { container } = render(<FallbackImage alt="" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies opacity-100 once the image finishes loading", () => {
    render(<FallbackImage src="https://cdn.example.com/foto.webp" alt="Kopi Susu" />);

    const img = screen.getByAltText("Kopi Susu");
    expect(img.className).toContain("opacity-0");

    fireEvent.load(img);

    expect(img.className).toContain("opacity-100");
  });

  it("treats an already-complete image with zero natural width as an error on mount", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);

    render(<FallbackImage src="https://cdn.example.com/broken.webp" alt="Kopi Susu" />);

    expect(screen.queryByAltText("Kopi Susu")).not.toBeInTheDocument();
    expect(screen.getByText("KS")).toBeInTheDocument();
  });

  it("marks an already-complete image as loaded on mount without waiting for the load event", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(200);

    render(<FallbackImage src="https://cdn.example.com/foto.webp" alt="Kopi Susu" />);

    const img = screen.getByAltText("Kopi Susu");
    expect(img.className).toContain("opacity-100");
  });

  it("resets error state when src changes", () => {
    const { rerender } = render(<FallbackImage src="https://cdn.example.com/broken.webp" alt="Kopi Susu" />);

    fireEvent.error(screen.getByAltText("Kopi Susu"));
    expect(screen.getByText("KS")).toBeInTheDocument();

    rerender(<FallbackImage src="https://cdn.example.com/fixed.webp" alt="Kopi Susu" />);

    expect(screen.getByAltText("Kopi Susu")).toBeInTheDocument();
  });
});
