import type {
  CartItem,
  LinkItem,
  Product,
  ProductVariantGroup,
  ProductVariantOption,
  Tenant,
} from "@/lib/types";

const baseDate = new Date("2025-01-01T00:00:00.000Z");
const ids = {
  user: "11111111-1111-4111-8111-111111111111",
  tenant: "22222222-2222-4222-8222-222222222222",
  product: "33333333-3333-4333-8333-333333333333",
  variantGroup: "44444444-4444-4444-8444-444444444444",
  variantOption: "55555555-5555-4555-8555-555555555555",
  link: "66666666-6666-4666-8666-666666666666",
};

export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: ids.user,
    email: "owner@example.com",
    name: "Owner Test",
    avatarUrl: "https://example.com/avatar.png",
    provider: "email",
    supabaseId: "supabase-user-test",
    emailVerified: baseDate,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

export function makeVariantOption(
  overrides: Partial<ProductVariantOption> = {},
): ProductVariantOption {
  return {
    id: ids.variantOption,
    name: "Reguler",
    priceDelta: 0,
    ...overrides,
  };
}

export function makeVariantGroup(
  overrides: Partial<ProductVariantGroup> = {},
): ProductVariantGroup {
  return {
    id: ids.variantGroup,
    name: "Ukuran",
    options: [makeVariantOption()],
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: ids.product,
    name: "Produk Test",
    description: "Deskripsi produk test",
    basePrice: 25000,
    image: "https://example.com/product.webp",
    variantGroups: [makeVariantGroup()],
    ...overrides,
  };
}

export function makeLink(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: ids.link,
    label: "Instagram",
    url: "https://instagram.com/tokolink",
    icon: "instagram",
    ...overrides,
  };
}

export function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    slug: "toko-test",
    name: "Toko Test",
    tagline: "Tagline test",
    avatar: "https://example.com/avatar.webp",
    whatsapp: "6281234567890",
    links: [makeLink()],
    products: [makeProduct()],
    ...overrides,
  };
}

export function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    key: "produk-test:reguler",
    productId: ids.product,
    productName: "Produk Test",
    variantId: ids.variantOption,
    variantName: "Reguler",
    unitPrice: 25000,
    qty: 1,
    image: "https://example.com/product.webp",
    ...overrides,
  };
}

export function makePrismaTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: ids.tenant,
    slug: "toko-test",
    name: "Toko Test",
    tagline: "Tagline test",
    avatar: "https://example.com/avatar.webp",
    whatsapp: "6281234567890",
    userId: ids.user,
    createdAt: baseDate,
    updatedAt: baseDate,
    products: [makeProduct()],
    links: [makeLink()],
    ...overrides,
  };
}
