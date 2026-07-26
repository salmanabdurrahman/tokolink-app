import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaKey, deleteObject, putObject, setStorageS3ClientForTest } from "./storage";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  setStorageS3ClientForTest(null);
  vi.clearAllMocks();
});

describe("createMediaKey", () => {
  it("creates stable tenant media key", () => {
    expect(
      createMediaKey({
        tenantId: "tenant-1",
        filename: "../Logo Toko.PNG",
        now: new Date("2026-07-04T12:00:00.000Z"),
        id: "uuid-1",
      }),
    ).toBe("tenants/tenant-1/2026/07/uuid-1-logo-toko.webp");
  });
});

describe("putObject", () => {
  it("uploads to R2 and returns public URL", async () => {
    process.env.R2_ACCOUNT_ID = "account-id";
    process.env.R2_ACCESS_KEY_ID = "access-key";
    process.env.R2_SECRET_ACCESS_KEY = "secret-key";
    process.env.R2_BUCKET = "tokolink-media";
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com/";

    const send = vi.fn(async () => ({}));
    setStorageS3ClientForTest({ send } as any);

    const result = await putObject({
      key: "tenants/tenant-1/2026/07/uuid-logo.webp",
      buffer: Buffer.from("image"),
      contentType: "image/webp",
    });

    expect(result).toEqual({
      key: "tenants/tenant-1/2026/07/uuid-logo.webp",
      url: "https://media.example.com/tenants/tenant-1/2026/07/uuid-logo.webp",
    });
    expect(send).toHaveBeenCalledOnce();
    const command = (send as any).mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Bucket: "tokolink-media",
      Key: "tenants/tenant-1/2026/07/uuid-logo.webp",
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("rejects incomplete R2 env", async () => {
    delete process.env.R2_BUCKET;

    await expect(
      putObject({ key: "a.webp", buffer: Buffer.from("image"), contentType: "image/webp" }),
    ).rejects.toThrow("Konfigurasi R2 belum lengkap");
  });

  it("throws production error instead of dev fallback when R2 env is incomplete", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.R2_BUCKET;

    await expect(
      putObject({ key: "a.webp", buffer: Buffer.from("image"), contentType: "image/webp" }),
    ).rejects.toThrow("Konfigurasi R2 belum lengkap untuk upload gambar.");
  });
});

describe("deleteObject", () => {
  it("deletes object from R2 using configured client", async () => {
    process.env.R2_ACCOUNT_ID = "account-id";
    process.env.R2_ACCESS_KEY_ID = "access-key";
    process.env.R2_SECRET_ACCESS_KEY = "secret-key";
    process.env.R2_BUCKET = "tokolink-media";
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com/";

    const send = vi.fn(async () => ({}));
    setStorageS3ClientForTest({ send } as any);

    await deleteObject("tenants/tenant-1/2026/07/uuid-logo.webp");

    expect(send).toHaveBeenCalledOnce();
    const command = (send as any).mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Bucket: "tokolink-media",
      Key: "tenants/tenant-1/2026/07/uuid-logo.webp",
    });
  });

  it("rejects incomplete R2 env", async () => {
    delete process.env.R2_BUCKET;

    await expect(deleteObject("a.webp")).rejects.toThrow(
      "Konfigurasi R2 belum lengkap. Tambahkan env R2 untuk hapus gambar.",
    );
  });
});
