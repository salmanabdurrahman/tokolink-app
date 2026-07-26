import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { scanMediaBuffer } from "./media-scan";
import { createMediaKey, storage } from "./storage";
import { requireTenant } from "./tenant-context.server";
import { z } from "zod";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;
const MAX_IMAGE_PIXELS = 12_000_000;
const ALLOWED_IMAGE_EXTENSIONS = new Set(["webp"]);

function readUInt32LE(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function readUInt32BE(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset);
}

export function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: readUInt32BE(buffer, 16), height: readUInt32BE(buffer, 20) };
  }

  if (buffer.length >= 30 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      return {
        width: readUInt16LE(buffer, 26) & 0x3fff,
        height: readUInt16LE(buffer, 28) & 0x3fff,
      };
    }
  }

  return null;
}

function readUInt16LE(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

export function hasAllowedImageExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_IMAGE_EXTENSIONS.has(extension);
}

export function isValidImageBuffer(buffer: Buffer): boolean {
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
    if (!hasAllowedImageExtension(data.name)) {
      throw new Error("Ekstensi gambar tidak didukung");
    }

    const base64Data = data.base64.split(",")[1] || data.base64;
    if (base64Data.length > MAX_BASE64_CHARS) {
      throw new Error("Ukuran gambar melebihi batas 5MB");
    }

    const buffer = Buffer.from(base64Data, "base64");

    if (!isValidImageBuffer(buffer)) {
      throw new Error("Format berkas tidak didukung. Upload harus berupa gambar WebP.");
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error("Ukuran gambar melebihi batas 5MB");
    }

    const dimensions = getImageDimensions(buffer);
    if (dimensions && dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
      throw new Error("Dimensi gambar terlalu besar");
    }

    const scanResult = await scanMediaBuffer(buffer);
    if (!scanResult.clean) {
      throw new Error("Gambar tidak lolos pemeriksaan keamanan");
    }

    const tenantId = requireTenant(context, "Toko belum tersedia untuk upload gambar.");

    const contentType = "image/webp";
    const key = createMediaKey({ tenantId, filename: data.name });
    const object = await storage.putObject({ key, buffer, contentType });

    const mediaModel = (prisma as any).media;
    if (mediaModel?.create) {
      await mediaModel.create({
        data: {
          key: object.key,
          url: object.url,
          size: buffer.length,
          mime: contentType,
          tenantId,
          ownerType: "tenant",
          ownerId: tenantId,
        },
      });
    }

    return { url: object.url, key: object.key };
  });
