import type { Tenant } from "./types";

export const demoTenant: Tenant = {
  slug: "kopi-senja",
  name: "Kopi Senja",
  tagline: "Specialty coffee roastery — diseduh dari Bandung.",
  avatar:
    "https://api.dicebear.com/9.x/initials/svg?seed=Kopi%20Senja&backgroundColor=D4FF3A&textColor=0A0A0A",
  whatsapp: "6281234567890",
  links: [
    { id: "l1", label: "Instagram", url: "https://instagram.com" },
    { id: "l2", label: "TikTok", url: "https://tiktok.com" },
    { id: "l3", label: "Google Maps", url: "https://maps.google.com" },
    { id: "l4", label: "Menu Cafe", url: "#" },
  ],
  products: [
    {
      id: "p1",
      name: "Arabika Gayo",
      description: "Single origin, medium roast, notes of caramel & citrus.",
      basePrice: 85000,
      image: "https://images.unsplash.com/photo-1559525839-d9acfd4ed4cf?w=800&q=80",
      variantGroups: [
        {
          id: "g1",
          name: "Ukuran",
          options: [
            { id: "o1", name: "100g", priceDelta: 0 },
            { id: "o2", name: "200g", priceDelta: 60000 },
            { id: "o3", name: "500g", priceDelta: 180000 },
          ],
        },
        {
          id: "g2",
          name: "Jenis Gilingan",
          options: [
            { id: "o4", name: "Biji Kopi", priceDelta: 0 },
            { id: "o5", name: "Giling Halus", priceDelta: 0 },
            { id: "o6", name: "Giling Kasar", priceDelta: 0 },
          ],
        },
      ],
    },
    {
      id: "p2",
      name: "Robusta Lampung",
      description: "Bold, earthy, perfect for espresso.",
      basePrice: 65000,
      image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
      variantGroups: [
        {
          id: "g3",
          name: "Ukuran",
          options: [
            { id: "o7", name: "100g", priceDelta: 0 },
            { id: "o8", name: "250g", priceDelta: 90000 },
          ],
        },
      ],
    },
    {
      id: "p3",
      name: "Tumbler Senja",
      description: "Stainless steel, 350ml, etched logo.",
      basePrice: 145000,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
      variantGroups: [
        {
          id: "g4",
          name: "Warna",
          options: [
            { id: "o9", name: "Hitam", priceDelta: 0 },
            { id: "o10", name: "Krem", priceDelta: 0 },
          ],
        },
        {
          id: "g5",
          name: "Custom Grafir Nama",
          options: [
            { id: "o11", name: "Tanpa Grafir", priceDelta: 0 },
            { id: "o12", name: "Dengan Grafir (+Rp15rb)", priceDelta: 15000 },
          ],
        },
      ],
    },
    {
      id: "p4",
      name: "Cold Brew Bottle",
      description: "300ml, ready-to-drink, brewed 18 jam.",
      basePrice: 35000,
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80",
    },
  ],
};

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
