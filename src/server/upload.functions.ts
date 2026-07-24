import { createServerFn } from "@tanstack/react-start";
import { put } from "@vercel/blob";
import { authMiddleware } from "./auth-middleware";
import { z } from "zod";

export function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return true;
  }

  if (buffer.length >= 12) {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    if (isRiff && isWebp) {
      return true;
    }
  }

  return false;
}

export const uploadImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    const base64Data = data.base64.split(",")[1] || data.base64;
    const buffer = Buffer.from(base64Data, "base64");

    if (!isValidImageBuffer(buffer)) {
      throw new Error(
        "Format berkas tidak didukung. Hanya gambar (PNG, JPG, WEBP, GIF) yang diperbolehkan.",
      );
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error("Ukuran gambar melebihi batas 5MB");
    }

    const tenantId = context.tenant?.id || "default";
    const cleanName = data.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const blobPath = `tenants/${tenantId}/${Date.now()}-${cleanName}`;

    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return { url: blob.url };
  });
