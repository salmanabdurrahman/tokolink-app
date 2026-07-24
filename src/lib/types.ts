export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
};

export type ProductVariantOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ProductVariantGroup = {
  id: string;
  name: string;
  options: ProductVariantOption[];
};

export type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  weightGram?: number;
  variantGroups?: ProductVariantGroup[];
};

export type Tenant = {
  slug: string;
  name: string;
  tagline: string;
  avatar: string;
  whatsapp: string;
  links: LinkItem[];
  products: Product[];
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
