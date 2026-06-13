export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
};

export type ProductVariantOption = {
  id: string;
  name: string;
  priceDelta: number; // adjustment vs base price
};

export type ProductVariantGroup = {
  id: string;
  name: string; // e.g. "Ukuran" | "Warna"
  options: ProductVariantOption[];
};

export type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  variantGroups?: ProductVariantGroup[];
};

export type Tenant = {
  slug: string;
  name: string;
  tagline: string;
  avatar: string;
  whatsapp: string; // E.164 without +
  links: LinkItem[];
  products: Product[];
};

export type CartItem = {
  key: string; // productId + variantIds
  productId: string;
  productName: string;
  variantId?: string; // comma separated option IDs
  variantName?: string; // comma separated option names
  unitPrice: number;
  qty: number;
  image: string;
};
