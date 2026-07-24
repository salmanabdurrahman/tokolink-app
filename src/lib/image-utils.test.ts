import { describe, expect, it, vi } from "vitest";
import { compressToWebP, validateImage } from "./image-utils";

const png = [0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0];
const jpeg = [0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const gif = [0x47, 0x49, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

function makeFile(bytes: number[], type: string, name = "image.bin") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateImage", () => {
  it("allows supported MIME types with matching magic bytes", async () => {
    await expect(validateImage(makeFile(jpeg, "image/jpeg"))).resolves.toEqual({ valid: true });
    await expect(validateImage(makeFile(png, "image/png"))).resolves.toEqual({ valid: true });
    await expect(validateImage(makeFile(gif, "image/gif"))).resolves.toEqual({ valid: true });
    await expect(validateImage(makeFile(webp, "image/webp"))).resolves.toEqual({ valid: true });
  });

  it("rejects unsupported MIME types, mismatched magic bytes, and too large files", async () => {
    await expect(validateImage(makeFile(png, "application/pdf"))).resolves.toMatchObject({
      valid: false,
    });
    await expect(validateImage(makeFile([1, 2, 3, 4], "image/png"))).resolves.toMatchObject({
      valid: false,
      error: "File bukan file gambar yang valid",
    });
    await expect(
      validateImage(makeFile([0x52, 0x49, 0x46, 0x46], "image/webp")),
    ).resolves.toMatchObject({
      valid: false,
      error: "File bukan file gambar yang valid",
    });

    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    });
    await expect(validateImage(largeFile)).resolves.toMatchObject({
      valid: false,
      error: "Ukuran gambar maksimal 5MB",
    });
  });

  it("catches slice/arrayBuffer failure and returns read error", async () => {
    const badFile = new File(["x"], "bad.png", { type: "image/png" });
    vi.spyOn(badFile, "slice").mockImplementation(() => {
      throw new Error("read failed");
    });

    await expect(validateImage(badFile)).resolves.toMatchObject({
      valid: false,
      error: "Gagal membaca file gambar",
    });
  });
});

describe("compressToWebP", () => {
  it("resizes wide images and resolves WebP blob", async () => {
    const blob = new Blob(["webp"], { type: "image/webp" });
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
      callback(blob);
      expect(type).toBe("image/webp");
      expect(quality).toBe(0.7);
    });

    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test") });
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob,
    } as unknown as HTMLCanvasElement);
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        width = 2400;
        height = 1200;

        set src(_value: string) {
          this.onload?.();
        }
      },
    );

    await expect(compressToWebP(makeFile(png, "image/png"), 0.7)).resolves.toBe(blob);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, 1200, 600);
  });

  it("rejects when canvas context is missing", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test") });
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement);
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        width = 800;
        height = 600;

        set src(_value: string) {
          this.onload?.();
        }
      },
    );

    await expect(compressToWebP(makeFile(png, "image/png"))).rejects.toThrow(
      "Gagal menginisialisasi canvas context",
    );
  });

  it("rejects when canvas cannot create blob", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test") });
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: vi.fn((callback: BlobCallback) => callback(null)),
    } as unknown as HTMLCanvasElement);
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        width = 800;
        height = 600;

        set src(_value: string) {
          this.onload?.();
        }
      },
    );

    await expect(compressToWebP(makeFile(png, "image/png"))).rejects.toThrow(
      "Gagal mengompresi gambar",
    );
  });

  it("rejects broken image files", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test") });
    vi.stubGlobal(
      "Image",
      class {
        onerror: (() => void) | null = null;

        set src(_value: string) {
          this.onerror?.();
        }
      },
    );

    await expect(compressToWebP(makeFile(png, "image/png"))).rejects.toThrow(
      "File gambar rusak atau tidak valid",
    );
  });
});
