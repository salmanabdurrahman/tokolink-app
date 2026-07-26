export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
  sortOrder?: number;
};

export type ProductVariantOption = {
  id?: string;
  name: string;
  priceDelta: number;
};

export type ProductVariantGroup = {
  id?: string;
  name: string;
  options: ProductVariantOption[];
};

export type ProductCategory = {
  id: string;
  name: string;
  sortOrder?: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  weightGram?: number;
  sortOrder?: number;
  variantGroups?: ProductVariantGroup[];
  stock?: number | null;
  trackStock?: boolean;
  categoryId?: string | null;
};

export type Tenant = {
  slug: string;
  name: string;
  tagline: string;
  avatar: string;
  whatsapp: string;
  originName?: string;
  originPhone?: string;
  originAddress?: string;
  originProvince?: string;
  originCity?: string;
  originDistrict?: string;
  originPostalCode?: string;
  rajaOngkirOriginId?: string;
  rajaOngkirOriginLabel?: string;
  allowedCouriers?: ("jne" | "jnt" | "sicepat" | "anteraja" | "pos" | "tiki" | "ninja")[];
  whatsappTemplate?: string;
  links: LinkItem[];
  products: Product[];
  categories: ProductCategory[];
};

export type CartItem = {
  key: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  qty: number;
  image: string;
};
