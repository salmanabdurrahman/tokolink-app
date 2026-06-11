import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// In a real database environment, database drivers are passed via PrismaPg adapter
// If running migrations or seed in node/bun CLI, we initialize the adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Tokolink database...");

  // 1. Clean existing data
  await prisma.link.deleteMany();
  await prisma.productVariantOption.deleteMany();
  await prisma.productVariantGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned database tables.");

  // 2. Create demo user
  const user = await prisma.user.create({
    data: {
      email: "demo@tokolink.app",
      name: "Demo Owner",
      provider: "email",
      supabaseId: "c032a1eb-4752-47d0-9943-7fdf0ab2de32", // Hardcoded UUID for consistency
    },
  });
  console.log("👤 Created demo user:", user.email);

  // 3. Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: "kopi-senja",
      name: "Kopi Senja",
      tagline: "Specialty coffee roastery — diseduh dari Bandung.",
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Kopi%20Senja&backgroundColor=D4FF3A&textColor=0A0A0A",
      whatsapp: "6281234567890",
      userId: user.id,
    },
  });
  console.log("🏪 Created demo tenant:", tenant.name);

  // 4. Create links
  await prisma.link.createMany({
    data: [
      {
        label: "Instagram",
        url: "https://instagram.com",
        sortOrder: 0,
        tenantId: tenant.id,
      },
      {
        label: "TikTok",
        url: "https://tiktok.com",
        sortOrder: 1,
        tenantId: tenant.id,
      },
      {
        label: "Google Maps",
        url: "https://maps.google.com",
        sortOrder: 2,
        tenantId: tenant.id,
      },
      {
        label: "Menu Cafe",
        url: "#",
        sortOrder: 3,
        tenantId: tenant.id,
      },
    ],
  });
  console.log("🔗 Created demo links.");

  // 5. Create products with variant groups and options
  // Product 1: Arabika Gayo
  const p1 = await prisma.product.create({
    data: {
      name: "Arabika Gayo",
      description: "Single origin, medium roast, notes of caramel & citrus.",
      basePrice: 85000,
      image: "https://images.unsplash.com/photo-1559525839-d9acfd4ed4cf?w=800&q=80",
      sortOrder: 0,
      tenantId: tenant.id,
      variantGroups: {
        create: [
          {
            name: "Ukuran",
            sortOrder: 0,
            options: {
              create: [
                { name: "100g", priceDelta: 0, sortOrder: 0 },
                { name: "200g", priceDelta: 60000, sortOrder: 1 },
                { name: "500g", priceDelta: 180000, sortOrder: 2 },
              ],
            },
          },
          {
            name: "Jenis Gilingan",
            sortOrder: 1,
            options: {
              create: [
                { name: "Biji Kopi", priceDelta: 0, sortOrder: 0 },
                { name: "Giling Halus", priceDelta: 0, sortOrder: 1 },
                { name: "Giling Kasar", priceDelta: 0, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  // Product 2: Robusta Lampung
  const p2 = await prisma.product.create({
    data: {
      name: "Robusta Lampung",
      description: "Bold, earthy, perfect for espresso.",
      basePrice: 65000,
      image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
      sortOrder: 1,
      tenantId: tenant.id,
      variantGroups: {
        create: [
          {
            name: "Ukuran",
            sortOrder: 0,
            options: {
              create: [
                { name: "100g", priceDelta: 0, sortOrder: 0 },
                { name: "250g", priceDelta: 90000, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  // Product 3: Tumbler Senja
  const p3 = await prisma.product.create({
    data: {
      name: "Tumbler Senja",
      description: "Stainless steel, 350ml, etched logo.",
      basePrice: 145000,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
      sortOrder: 2,
      tenantId: tenant.id,
      variantGroups: {
        create: [
          {
            name: "Warna",
            sortOrder: 0,
            options: {
              create: [
                { name: "Hitam", priceDelta: 0, sortOrder: 0 },
                { name: "Krem", priceDelta: 0, sortOrder: 1 },
              ],
            },
          },
          {
            name: "Custom Grafir Nama",
            sortOrder: 1,
            options: {
              create: [
                { name: "Tanpa Grafir", priceDelta: 0, sortOrder: 0 },
                { name: "Dengan Grafir (+Rp15rb)", priceDelta: 15000, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  // Product 4: Cold Brew Bottle
  const p4 = await prisma.product.create({
    data: {
      name: "Cold Brew Bottle",
      description: "300ml, ready-to-drink, brewed 18 jam.",
      basePrice: 35000,
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80",
      sortOrder: 3,
      tenantId: tenant.id,
    },
  });

  console.log("☕ Seeded products with variants.");
  console.log("✅ Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
