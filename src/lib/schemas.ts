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
});

export const updateTenantSchema = createTenantSchema
  .extend({
    originName: z.string().max(80).optional(),
    originPhone: z.string().max(30).optional(),
    originAddress: z.string().max(300).optional(),
    originProvince: z.string().max(80).optional(),
    originCity: z.string().max(80).optional(),
    originDistrict: z.string().max(80).optional(),
    originPostalCode: z.string().max(10).optional(),
    rajaOngkirOriginId: z.string().max(80).optional(),
    rajaOngkirOriginLabel: z.string().max(160).optional(),
    whatsappTemplate: z.string().max(500, "Template WhatsApp maksimal 500 karakter").optional(),
    allowedCouriers: z
      .array(z.enum(["jne", "jnt", "sicepat", "anteraja", "pos", "tiki", "ninja"]))
      .min(1, "Pilih minimal 1 kurir")
      .optional(),
  })
  .partial();

export const productVariantOptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama opsi harus diisi").max(50),
  priceDelta: z.number().int().min(0, "Selisih harga tidak boleh negatif").default(0),
});

export const productVariantGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama varian harus diisi").max(50),
  options: z.array(productVariantOptionSchema).min(1, "Harus ada minimal 1 opsi varian"),
});

const productBaseSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi").max(100),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter").default(""),
  basePrice: z.number().int().min(0, "Harga dasar tidak boleh negatif"),
  image: z.string().url("URL gambar tidak valid").or(z.literal("")).default(""),
  variantGroups: z.array(productVariantGroupSchema).optional().default([]),
  trackStock: z.boolean().default(false),
  stock: z.number().int().min(0, "Stok tidak boleh negatif").nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const createProductSchema = productBaseSchema.refine(
  (data) => !data.trackStock || typeof data.stock === "number",
  { message: "Isi jumlah stok atau matikan pelacakan stok", path: ["stock"] },
);

export const updateProductSchema = productBaseSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori harus diisi").max(50),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createLinkSchema = z.object({
  label: z.string().min(1, "Label harus diisi").max(50),
  url: z.string().url("URL tidak valid").or(z.literal("#")),
  icon: z.string().max(50).nullable().optional(),
});

export const updateLinkSchema = createLinkSchema.partial();

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantOptionIds: z.array(z.string().uuid()).default([]),
  qty: z.number().int().min(1, "Jumlah minimal 1").max(99, "Jumlah maksimal 99"),
});

export const checkoutCustomerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(80, "Nama maksimal 80 karakter"),
  email: z.string().email("Email tidak valid").or(z.literal("")).default(""),
  whatsapp: z
    .string()
    .regex(/^62\d{9,15}$/, "Nomor WhatsApp harus diawali dengan 62 (contoh: 628123456789)"),
  address: z.string().min(5, "Alamat harus diisi").max(300, "Alamat maksimal 300 karakter"),
  province: z.string().max(80).default(""),
  city: z.string().max(80).default(""),
  district: z.string().max(80).default(""),
  postalCode: z.string().max(10).default(""),
  rajaOngkirDestinationId: z.string().max(80).default(""),
  rajaOngkirDestinationLabel: z.string().max(160).default(""),
});

export const checkoutShippingSchema = z.object({
  courier: z.string().min(1, "Kurir harus diisi").max(40),
  service: z.string().min(1, "Layanan harus diisi").max(80),
  etd: z.string().max(80).default(""),
  cost: z.number().int().min(1, "Pilih layanan pengiriman"),
});

export const checkoutSchema = z.object({
  tenantSlug: tenantSlugSchema,
  items: z.array(checkoutItemSchema).min(1, "Keranjang masih kosong"),
  customer: checkoutCustomerSchema,
  shipping: checkoutShippingSchema,
});

// payment_completed is intentionally excluded: it is only recorded from the
// trusted Pakasir webhook flow (already payment-verified), never from this
// public client-facing endpoint, so it can't be spoofed to inflate revenue
// funnel numbers.
export const recordAnalyticsEventSchema = z.object({
  tenantSlug: tenantSlugSchema,
  event: z.enum(["storefront_view", "product_click", "checkout_started", "whatsapp_click"]),
});
