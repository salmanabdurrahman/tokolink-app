import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Tokolink database...");

  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.link.deleteMany();
  await prisma.productVariantOption.deleteMany();
  await prisma.productVariantGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned database tables.");

  const user = await prisma.user.create({
    data: {
      email: "demo@tokolink.app",
      name: "Demo Owner",
      provider: "email",
      supabaseId: "c032a1eb-4752-47d0-9943-7fdf0ab2de32",
    },
  });
  console.log("👤 Created demo user:", user.email);

  const tenant = await prisma.tenant.create({
    data: {
      slug: "kopi-senja",
      name: "Kopi Senja",
      tagline: "Specialty coffee roastery — diseduh dari Bandung.",
      avatar:
        "https://api.dicebear.com/9.x/initials/svg?seed=Kopi%20Senja&backgroundColor=D4FF3A&textColor=0A0A0A",
      whatsapp: "6281234567890",
      originName: "Kopi Senja HQ",
      originPhone: "6281234567890",
      originAddress: "Jl. Braga No. 10",
      originProvince: "Jawa Barat",
      originCity: "Bandung",
      originDistrict: "Sumur Bandung",
      originPostalCode: "40111",
      rajaOngkirOriginId: "23",
      rajaOngkirOriginLabel: "Sumur Bandung, Kota Bandung, Jawa Barat 40111",
      userId: user.id,
    },
  });
  console.log("🏪 Created demo tenant:", tenant.name);

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

  const p1 = await prisma.product.create({
    data: {
      name: "Arabika Gayo",
      description: "Single origin, medium roast, notes of caramel & citrus.",
      basePrice: 85000,
      image: "https://images.unsplash.com/photo-1559525839-d9acfd4ed4cf?w=800&q=80",
      weightGram: 200,
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

  const p2 = await prisma.product.create({
    data: {
      name: "Robusta Lampung",
      description: "Bold, earthy, perfect for espresso.",
      basePrice: 65000,
      image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
      weightGram: 250,
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

  const p3 = await prisma.product.create({
    data: {
      name: "Tumbler Senja",
      description: "Stainless steel, 350ml, etched logo.",
      basePrice: 145000,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
      weightGram: 350,
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

  const p4 = await prisma.product.create({
    data: {
      name: "Cold Brew Bottle",
      description: "300ml, ready-to-drink, brewed 18 jam.",
      basePrice: 35000,
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80",
      weightGram: 300,
      sortOrder: 3,
      tenantId: tenant.id,
    },
  });

  console.log("☕ Seeded products with variants.");

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "Ayu Lestari",
      email: "ayu@example.com",
      whatsapp: "6281299988877",
      address: "Jl. Melati No. 7",
      province: "Jawa Barat",
      city: "Bandung",
      district: "Coblong",
      postalCode: "40132",
      rajaOngkirDestinationId: "24",
      rajaOngkirDestinationLabel: "Coblong, Kota Bandung, Jawa Barat 40132",
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: "TKL-DEMO-0001",
      tenantId: tenant.id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerWhatsapp: customer.whatsapp,
      customerAddress: customer.address,
      customerProvince: customer.province,
      customerCity: customer.city,
      customerDistrict: customer.district,
      customerPostalCode: customer.postalCode,
      rajaOngkirDestinationId: customer.rajaOngkirDestinationId,
      rajaOngkirDestinationLabel: customer.rajaOngkirDestinationLabel,
      subtotal: 85000,
      shippingCost: 12000,
      platformFee: 1275,
      total: 97000,
      status: "PAID",
      courier: "jne",
      shippingService: "REG",
      shippingEtd: "2-3 hari",
      shippingWeightGram: 200,
      paidAt: new Date("2025-01-02T10:00:00.000Z"),
      items: {
        create: [
          {
            productId: p1.id,
            productName: p1.name,
            productImage: p1.image,
            variantName: "100g / Biji Kopi",
            variantSnapshot: [
              { groupName: "Ukuran", optionName: "100g", priceDelta: 0 },
              { groupName: "Jenis Gilingan", optionName: "Biji Kopi", priceDelta: 0 },
            ],
            qty: 1,
            unitPrice: 85000,
            totalPrice: 85000,
            weightGram: 200,
            totalWeightGram: 200,
          },
        ],
      },
      payment: {
        create: {
          provider: "PAKASIR",
          pakasirOrderId: "TKL-DEMO-0001",
          amount: 97000,
          status: "PAID",
          method: "qris",
          paidAt: new Date("2025-01-02T10:00:00.000Z"),
          rawPayload: { demo: true, status: "paid" },
        },
      },
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        tenantId: tenant.id,
        orderId: order.id,
        type: "CREDIT",
        amount: 85000,
        availableAt: new Date("2025-01-04T10:00:00.000Z"),
        status: "PENDING",
        note: "Demo order product subtotal",
      },
      {
        tenantId: tenant.id,
        orderId: order.id,
        type: "FEE",
        amount: -1275,
        availableAt: new Date("2025-01-04T10:00:00.000Z"),
        status: "PENDING",
        note: "Platform fee 1.5%",
      },
    ],
  });

  await prisma.withdrawalRequest.create({
    data: {
      tenantId: tenant.id,
      amount: 50000,
      status: "REQUESTED",
      note: "Demo withdrawal request",
    },
  });

  console.log("🛒 Seeded demo customer, order, payment, ledger, and withdrawal.");
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
