import { describe, expect, it, vi } from "vitest";
import { validateImage } from "./image-utils";

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
