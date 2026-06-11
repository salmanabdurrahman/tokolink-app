import { createServerFn } from "@tanstack/react-start";
import { put } from "@vercel/blob";
import { authMiddleware } from "./auth-middleware";
import { z } from "zod";

export const uploadImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      base64: z.string().min(1),
    })
  )
  .handler(async ({ data, context }) => {
    // 1. Get base64 content
    const base64Data = data.base64.split(",")[1] || data.base64;
    const buffer = Buffer.from(base64Data, "base64");

    // 2. Server-side validation (Defense-in-depth)
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error("Ukuran gambar melebihi batas 5MB");
    }

    const tenantId = context.tenant?.id || "default";
    const cleanName = data.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const blobPath = `tenants/${tenantId}/${Date.now()}-${cleanName}`;

    // 3. Upload to Vercel Blob CDN
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return { url: blob.url };
  });
