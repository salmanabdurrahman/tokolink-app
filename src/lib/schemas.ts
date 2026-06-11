import { z } from "zod";

export const tenantSlugSchema = z
  .string()
  .min(3, "Slug minimal 3 karakter")
  .max(30, "Slug maksimal 30 karakter")
  .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)");

export const createTenantSchema = z.object({
  slug: tenantSlugSchema,
  name: z.string().min(2, "Nama minimal 2 karakter").max(50, "Nama maksimal 50 karakter"),
  tagline: z.string().max(100, "Tagline maksimal 100 karakter").default(""),
  avatar: z.string().url("URL avatar tidak valid").or(z.literal("")).default(""),
  whatsapp: z
    .string()
    .regex(/^62\d{9,15}$/, "Nomor WhatsApp harus diawali dengan 62 (contoh: 628123456789)")
    .or(z.literal(""))
    .default(""),
  recaptchaToken: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export const productVariantOptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama opsi harus diisi").max(50),
  priceDelta: z.number().int().min(0, "Selisih harga tidak boleh negatif").default(0),
});

export const productVariantGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama varian harus diisi").max(50), // e.g. "Ukuran", "Warna"
  options: z.array(productVariantOptionSchema).min(1, "Harus ada minimal 1 opsi varian"),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi").max(100),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter").default(""),
  basePrice: z.number().int().min(0, "Harga dasar tidak boleh negatif"),
  image: z.string().url("URL gambar tidak valid").or(z.literal("")).default(""),
  variantGroups: z.array(productVariantGroupSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const createLinkSchema = z.object({
  label: z.string().min(1, "Label harus diisi").max(50),
  url: z.string().url("URL tidak valid").or(z.literal("#")),
  icon: z.string().max(50).nullable().optional(),
});

export const updateLinkSchema = createLinkSchema.partial();
