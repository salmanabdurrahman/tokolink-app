import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    media: {
      create: vi.fn(),
    },
  },
}));

vi.mock("./storage", () => ({
  createMediaKey: vi.fn(() => "tenants/tenant-1/2026/01/id-logo.webp"),
  storage: {
    putObject: vi.fn(async ({ key }) => ({
      key,
      url: `https://cdn.example.com/${key}`,
    })),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./media-scan", () => ({
  scanMediaBuffer: vi.fn(async () => ({ clean: true })),
}));

import { prisma } from "../db";
import { scanMediaBuffer } from "./media-scan";
import { createMediaKey, storage } from "./storage";
import {
  getImageDimensions,
  hasAllowedImageExtension,
  isValidImageBuffer,
  uploadImage,
} from "./upload.functions";

const uploadImageHandler = uploadImage as any;
const tenantContext = { tenant: { id: "tenant-1" } };
const webpBytes = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const webpBase64 = webpBytes.toString("base64");

describe("isValidImageBuffer", () => {
  it("accepts supported image magic bytes", () => {
    expect(isValidImageBuffer(webpBytes)).toBe(true);
  });

  it("rejects invalid and too short buffers", () => {
    expect(isValidImageBuffer(Buffer.from([0x89, 0x50, 0x4e]))).toBe(false);
    expect(isValidImageBuffer(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBe(false);
    expect(
      isValidImageBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x4e, 0x4f, 0x50, 0x45])),
    ).toBe(false);
  });
});

describe("hasAllowedImageExtension", () => {
  it("rejects mismatched unsupported filename extension", () => {
    expect(hasAllowedImageExtension("produk.webp")).toBe(true);
    expect(hasAllowedImageExtension("produk.txt")).toBe(false);
  });
});

describe("getImageDimensions", () => {
  it("reads PNG dimensions", () => {
    const buffer = Buffer.alloc(24);
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer.writeUInt32BE(1200, 16);
    buffer.writeUInt32BE(800, 20);

    expect(getImageDimensions(buffer)).toEqual({ width: 1200, height: 800 });
  });

  it("reads lossy VP8 webp dimensions", () => {
    const buffer = Buffer.alloc(30);
    buffer[0] = 0x52;
    buffer[1] = 0x49;
    buffer[2] = 0x46;
    buffer[3] = 0x46;
    buffer[8] = 0x57;
    buffer[9] = 0x45;
    buffer[10] = 0x42;
    buffer[11] = 0x50;
    buffer.write("VP8 ", 12, "ascii");
    buffer.writeUInt16LE(640, 26);
    buffer.writeUInt16LE(480, 28);

    expect(getImageDimensions(buffer)).toEqual({ width: 640, height: 480 });
  });

  it("returns null for buffers without a recognized image signature", () => {
    expect(getImageDimensions(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });
});

describe("uploadImage", () => {
  beforeEach(() => {
    vi.mocked(createMediaKey).mockClear();
    vi.mocked(storage.putObject).mockClear();
    vi.mocked((prisma as any).media.create).mockClear();
  });

  it("uploads valid image and returns URL", async () => {
    const result = await uploadImageHandler({
      data: { name: "logo.webp", base64: `data:image/webp;base64,${webpBase64}` },
      context: tenantContext,
    });

    expect(result).toHaveProperty("url");
    expect(result.url).toContain("cdn.example.com");
    expect(result.key).toBe("tenants/tenant-1/2026/01/id-logo.webp");
    expect(createMediaKey).toHaveBeenCalledWith({ tenantId: "tenant-1", filename: "logo.webp" });
    expect(storage.putObject).toHaveBeenCalledWith({
      key: "tenants/tenant-1/2026/01/id-logo.webp",
      buffer: Buffer.from(webpBase64, "base64"),
      contentType: "image/webp",
    });
    expect((prisma as any).media.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "tenants/tenant-1/2026/01/id-logo.webp",
        url: "https://cdn.example.com/tenants/tenant-1/2026/01/id-logo.webp",
        size: Buffer.from(webpBase64, "base64").length,
        mime: "image/webp",
        tenantId: "tenant-1",
        ownerType: "tenant",
        ownerId: "tenant-1",
      }),
    });
  });

  it("rejects upload without tenant context", async () => {
    await expect(
      uploadImageHandler({
        data: { name: "logo.webp", base64: `data:image/webp;base64,${webpBase64}` },
        context: {},
      }),
    ).rejects.toThrow("Toko belum tersedia untuk upload gambar.");
  });

  it("rejects unsupported filename extension", async () => {
    await expect(
      uploadImageHandler({
        data: { name: "bad.txt", base64: `data:image/webp;base64,${webpBase64}` },
        context: tenantContext,
      }),
    ).rejects.toThrow("Ekstensi gambar tidak didukung");
  });

  it("rejects invalid image buffer", async () => {
    const badBase64 = Buffer.from([0x00, 0x01, 0x02, 0x03]).toString("base64");

    await expect(
      uploadImageHandler({
        data: { name: "bad.webp", base64: badBase64 },
        context: tenantContext,
      }),
    ).rejects.toThrow("Format berkas tidak didukung. Upload harus berupa gambar WebP.");
  });

  it("rejects oversized base64 before decode", async () => {
    await expect(
      uploadImageHandler({
        data: { name: "big.webp", base64: "a".repeat(7_000_000) },
        context: tenantContext,
      }),
    ).rejects.toThrow("Ukuran gambar melebihi batas 5MB");
  });

  it("rejects oversized image", async () => {
    const oversizedBuf = Buffer.alloc(6 * 1024 * 1024, 0);
    webpBytes.copy(oversizedBuf, 0);
    const bigBase64 = oversizedBuf.toString("base64");

    await expect(
      uploadImageHandler({
        data: { name: "big.webp", base64: bigBase64 },
        context: tenantContext,
      }),
    ).rejects.toThrow("Ukuran gambar melebihi batas 5MB");
  });

  it("rejects image with dimensions exceeding pixel limit", async () => {
    const pngBuffer = Buffer.alloc(24);
    pngBuffer[0] = 0x89;
    pngBuffer[1] = 0x50;
    pngBuffer.writeUInt32BE(4000, 16);
    pngBuffer.writeUInt32BE(4000, 20);
    // Prefix with valid webp magic bytes so isValidImageBuffer passes, then
    // pad so getImageDimensions still reads the PNG signature written above
    // is irrelevant here; use a webp buffer whose declared dimensions exceed
    // the pixel budget instead.
    const oversizedDimsBuf = Buffer.from(webpBytes);
    oversizedDimsBuf.write("VP8X", 12, "ascii");
    oversizedDimsBuf.writeUIntLE(3999, 24, 3); // width - 1
    oversizedDimsBuf.writeUIntLE(3999, 27, 3); // height - 1
    const base64 = oversizedDimsBuf.toString("base64");

    await expect(
      uploadImageHandler({
        data: { name: "huge.webp", base64 },
        context: tenantContext,
      }),
    ).rejects.toThrow("Dimensi gambar terlalu besar");
  });

  it("rejects image that fails media security scan", async () => {
    vi.mocked(scanMediaBuffer).mockResolvedValueOnce({ clean: false });

    await expect(
      uploadImageHandler({
        data: { name: "logo.webp", base64: `data:image/webp;base64,${webpBase64}` },
        context: tenantContext,
      }),
    ).rejects.toThrow("Gambar tidak lolos pemeriksaan keamanan");
  });

  it("skips media record creation when media model is unavailable", async () => {
    const originalMedia = (prisma as any).media;
    (prisma as any).media = undefined;

    try {
      const result = await uploadImageHandler({
        data: { name: "logo.webp", base64: `data:image/webp;base64,${webpBase64}` },
        context: tenantContext,
      });

      expect(result).toHaveProperty("url");
    } finally {
      (prisma as any).media = originalMedia;
    }
  });
});
