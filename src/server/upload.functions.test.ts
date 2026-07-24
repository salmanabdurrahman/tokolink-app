import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async () => ({ url: "https://blob.vercel-storage.com/test-abc123.webp" })),
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));

import { put } from "@vercel/blob";
import { isValidImageBuffer, uploadImage } from "./upload.functions";

const uploadImageHandler = uploadImage as any;
const tenantContext = { tenant: { id: "tenant-1" } };
const pngBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

describe("isValidImageBuffer", () => {
  it("accepts supported image magic bytes", () => {
    expect(isValidImageBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    expect(isValidImageBuffer(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe(true);
    expect(isValidImageBuffer(Buffer.from([0x47, 0x49, 0x46, 0x38]))).toBe(true);
    expect(
      isValidImageBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe(true);
  });

  it("rejects invalid and too short buffers", () => {
    expect(isValidImageBuffer(Buffer.from([0x89, 0x50, 0x4e]))).toBe(false);
    expect(isValidImageBuffer(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBe(false);
    expect(
      isValidImageBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x4e, 0x4f, 0x50, 0x45])),
    ).toBe(false);
  });
});

describe("uploadImage", () => {
  beforeEach(() => {
    vi.mocked(put).mockClear();
  });

  it("uploads valid image and returns URL", async () => {
    const result = await uploadImageHandler({
      data: { name: "logo.png", base64: `data:image/png;base64,${pngBase64}` },
      context: tenantContext,
    });

    expect(result).toHaveProperty("url");
    expect(result.url).toContain("blob.vercel-storage.com");
    expect(put).toHaveBeenCalledOnce();
  });

  it("rejects invalid image buffer", async () => {
    const badBase64 = Buffer.from([0x00, 0x01, 0x02, 0x03]).toString("base64");

    await expect(
      uploadImageHandler({
        data: { name: "bad.png", base64: badBase64 },
        context: tenantContext,
      }),
    ).rejects.toThrow(
      "Format berkas tidak didukung. Hanya gambar (PNG, JPG, WEBP, GIF) yang diperbolehkan.",
    );
  });

  it("rejects oversized image", async () => {
    const oversizedBuf = Buffer.alloc(6 * 1024 * 1024, 0x89);
    oversizedBuf[0] = 0x89;
    oversizedBuf[1] = 0x50;
    oversizedBuf[2] = 0x4e;
    oversizedBuf[3] = 0x47;
    const bigBase64 = oversizedBuf.toString("base64");

    await expect(
      uploadImageHandler({
        data: { name: "big.png", base64: bigBase64 },
        context: tenantContext,
      }),
    ).rejects.toThrow("Ukuran gambar melebihi batas 5MB");
  });
});
