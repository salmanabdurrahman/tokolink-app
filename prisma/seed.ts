import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Keep in sync with src/lib/commerce-policy.ts
const PLATFORM_FEE_RATE = 0.015;
const WITHDRAWAL_HOLD_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (n: number, hour = 10) => {
  const d = new Date(NOW - n * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const feeOf = (subtotal: number) => Math.ceil(subtotal * PLATFORM_FEE_RATE);

// Realistic Unsplash imagery (coffee & merch).
const IMG = {
  arabika: "https://images.unsplash.com/photo-1559525839-d9acfd4ed4cf?w=800&q=80",
  robusta: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
  liberika: "https://images.unsplash.com/photo-1524350876685-274059332603?w=800&q=80",
  dripBag: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&q=80",
  espressoBlend: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80",
  tumbler: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
  mug: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80",
  totebag: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80",
  coldBrew: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80",
  latte: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
  americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80",
  giftSet: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80",
};

async function main() {
  console.log("Seeding Tokolink database...");

  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.analyticsDaily.deleteMany();
  await prisma.link.deleteMany();
  await prisma.media.deleteMany();
  await prisma.productVariantOption.deleteMany();
  await prisma.productVariantGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleaned database tables.");

  const user = await prisma.user.create({
    data: {
      email: "demo@tokolink.app",
      name: "Rangga Prawira",
      avatarUrl: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=256&q=80",
      provider: "email",
      supabaseId: "c032a1eb-4752-47d0-9943-7fdf0ab2de32",
      emailVerified: daysAgo(120),
    },
  });
  console.log("Created demo user:", user.email);

  const tenant = await prisma.tenant.create({
    data: {
      slug: "tokolink",
      name: "Kopi Nusantara",
      tagline: "Sangrai segar tiap minggu — kopi specialty asli Nusantara ☕",
      avatar: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=256&q=80",
      whatsapp: "6281234567890",
      whatsappTemplate:
        "Halo *Kopi Nusantara* 👋\nSaya mau pesan:\n{items}\n\nTotal: *{total}*\nAtas nama: {name}",
      userId: user.id,
      originName: "Kopi Nusantara Roastery",
      originPhone: "6281234567890",
      originAddress: "Jl. Braga No. 10, Braga",
      originProvince: "Jawa Barat",
      originCity: "Kota Bandung",
      originDistrict: "Sumur Bandung",
      originPostalCode: "40111",
      rajaOngkirOriginId: "23",
      rajaOngkirOriginLabel: "Sumur Bandung, Kota Bandung, Jawa Barat 40111",
      allowedCouriers: ["jne", "jnt", "sicepat", "anteraja", "pos"],
    },
  });
  console.log("Created demo tenant:", `${tenant.name} (/${tenant.slug})`);

  const [catBeans, catDrip, catMerch, catRtd] = await Promise.all([
    prisma.productCategory.create({
      data: { name: "Biji & Bubuk Kopi", sortOrder: 0, tenantId: tenant.id },
    }),
    prisma.productCategory.create({
      data: { name: "Drip Bag & Praktis", sortOrder: 1, tenantId: tenant.id },
    }),
    prisma.productCategory.create({
      data: { name: "Merchandise", sortOrder: 2, tenantId: tenant.id },
    }),
    prisma.productCategory.create({
      data: { name: "Minuman Siap Minum", sortOrder: 3, tenantId: tenant.id },
    }),
  ]);
  console.log("Created product categories.");

  await prisma.link.createMany({
    data: [
      {
        label: "Instagram",
        url: "https://instagram.com/kopinusantara",
        icon: "instagram",
        sortOrder: 0,
        tenantId: tenant.id,
      },
      {
        label: "TikTok",
        url: "https://tiktok.com/@kopinusantara",
        icon: "music",
        sortOrder: 1,
        tenantId: tenant.id,
      },
      {
        label: "Lokasi Roastery (Google Maps)",
        url: "https://maps.google.com/?q=Braga+Bandung",
        icon: "map-pin",
        sortOrder: 2,
        tenantId: tenant.id,
      },
      {
        label: "Katalog & Menu Cafe",
        url: "https://kopinusantara.example.com/menu",
        icon: "book-open",
        sortOrder: 3,
        tenantId: tenant.id,
      },
      {
        label: "WhatsApp Admin",
        url: "https://wa.me/6281234567890",
        icon: "message-circle",
        sortOrder: 4,
        tenantId: tenant.id,
      },
      {
        label: "Reseller & Grosir",
        url: "https://kopinusantara.example.com/reseller",
        icon: "handshake",
        sortOrder: 5,
        tenantId: tenant.id,
      },
    ],
  });
  console.log("Created links.");

  // ---- Products -------------------------------------------------------------
  const arabikaGayo = await prisma.product.create({
    data: {
      name: "Arabika Gayo",
      description:
        "Single origin dataran tinggi Gayo, Aceh. Medium roast dengan notes karamel, jeruk, dan cokelat susu. Body seimbang, cocok untuk V60 & tubruk.",
      basePrice: 85000,
      image: IMG.arabika,
      weightGram: 200,
      sortOrder: 0,
      stock: 24,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catBeans.id,
      variantGroups: {
        create: [
          {
            name: "Ukuran",
            sortOrder: 0,
            options: {
              create: [
                { name: "100g", priceDelta: 0, sortOrder: 0 },
                { name: "200g", priceDelta: 60000, sortOrder: 1 },
                { name: "500g", priceDelta: 175000, sortOrder: 2 },
              ],
            },
          },
          {
            name: "Gilingan",
            sortOrder: 1,
            options: {
              create: [
                { name: "Biji Utuh", priceDelta: 0, sortOrder: 0 },
                { name: "Halus (Espresso)", priceDelta: 0, sortOrder: 1 },
                { name: "Sedang (V60)", priceDelta: 0, sortOrder: 2 },
                { name: "Kasar (Tubruk)", priceDelta: 0, sortOrder: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  const robustaLampung = await prisma.product.create({
    data: {
      name: "Robusta Lampung",
      description:
        "Bold, earthy, dan tinggi kafein. Dark roast pilihan untuk espresso dan kopi susu. Crema tebal, aftertaste cokelat pahit.",
      basePrice: 65000,
      image: IMG.robusta,
      weightGram: 200,
      sortOrder: 1,
      stock: 40,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catBeans.id,
      variantGroups: {
        create: [
          {
            name: "Ukuran",
            sortOrder: 0,
            options: {
              create: [
                { name: "200g", priceDelta: 0, sortOrder: 0 },
                { name: "500g", priceDelta: 120000, sortOrder: 1 },
                { name: "1kg", priceDelta: 230000, sortOrder: 2 },
              ],
            },
          },
          {
            name: "Gilingan",
            sortOrder: 1,
            options: {
              create: [
                { name: "Biji Utuh", priceDelta: 0, sortOrder: 0 },
                { name: "Halus (Espresso)", priceDelta: 0, sortOrder: 1 },
                { name: "Kasar (Tubruk)", priceDelta: 0, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  const liberika = await prisma.product.create({
    data: {
      name: "Liberika Rangsang Meranti",
      description:
        "Kopi langka dari Riau dengan aroma nangka dan floral. Roast light-medium, karakter unik dan eksotis. Stok terbatas tiap batch.",
      basePrice: 110000,
      image: IMG.liberika,
      weightGram: 200,
      sortOrder: 2,
      stock: 8,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catBeans.id,
      variantGroups: {
        create: [
          {
            name: "Ukuran",
            sortOrder: 0,
            options: {
              create: [
                { name: "100g", priceDelta: 0, sortOrder: 0 },
                { name: "200g", priceDelta: 80000, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const espressoBlend = await prisma.product.create({
    data: {
      name: "House Espresso Blend",
      description:
        "Blend signature 70% Arabika Gayo + 30% Robusta Lampung. Diracik untuk mesin espresso rumahan maupun cafe. Balance manis & body.",
      basePrice: 78000,
      image: IMG.espressoBlend,
      weightGram: 250,
      sortOrder: 3,
      stock: 30,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catBeans.id,
      variantGroups: {
        create: [
          {
            name: "Gilingan",
            sortOrder: 0,
            options: {
              create: [
                { name: "Biji Utuh", priceDelta: 0, sortOrder: 0 },
                { name: "Halus (Espresso)", priceDelta: 0, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const dripBag = await prisma.product.create({
    data: {
      name: "Drip Bag Coffee (Isi 10)",
      description:
        "Kopi seduh praktis tanpa alat. Isi 10 sachet drip bag single serve. Tinggal tuang air panas, kopi specialty siap dalam 3 menit.",
      basePrice: 55000,
      image: IMG.dripBag,
      weightGram: 150,
      sortOrder: 4,
      stock: 60,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catDrip.id,
      variantGroups: {
        create: [
          {
            name: "Varian Rasa",
            sortOrder: 0,
            options: {
              create: [
                { name: "Arabika Gayo", priceDelta: 0, sortOrder: 0 },
                { name: "House Blend", priceDelta: 0, sortOrder: 1 },
                { name: "Mix (5+5)", priceDelta: 5000, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  const giftSet = await prisma.product.create({
    data: {
      name: "Gift Set Kopi + Kartu Ucapan",
      description:
        "Paket hadiah eksklusif: 2 pack kopi 100g + kartu ucapan custom + box kraft premium. Cocok untuk hampers & corporate gift.",
      basePrice: 165000,
      image: IMG.giftSet,
      weightGram: 450,
      sortOrder: 5,
      stock: 15,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catDrip.id,
      variantGroups: {
        create: [
          {
            name: "Pilihan Kopi",
            sortOrder: 0,
            options: {
              create: [
                { name: "Arabika + House Blend", priceDelta: 0, sortOrder: 0 },
                { name: "Arabika + Liberika", priceDelta: 25000, sortOrder: 1 },
              ],
            },
          },
          {
            name: "Kartu Ucapan",
            sortOrder: 1,
            options: {
              create: [
                { name: "Tanpa Teks", priceDelta: 0, sortOrder: 0 },
                { name: "Custom Teks", priceDelta: 0, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const tumbler = await prisma.product.create({
    data: {
      name: "Tumbler Nusantara 350ml",
      description:
        "Stainless steel double wall, tahan panas & dingin 6 jam. Etched logo Kopi Nusantara. Bebas BPA.",
      basePrice: 145000,
      image: IMG.tumbler,
      weightGram: 350,
      sortOrder: 6,
      stock: 20,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catMerch.id,
      variantGroups: {
        create: [
          {
            name: "Warna",
            sortOrder: 0,
            options: {
              create: [
                { name: "Hitam Doff", priceDelta: 0, sortOrder: 0 },
                { name: "Krem", priceDelta: 0, sortOrder: 1 },
                { name: "Hijau Army", priceDelta: 0, sortOrder: 2 },
              ],
            },
          },
          {
            name: "Grafir Nama",
            sortOrder: 1,
            options: {
              create: [
                { name: "Tanpa Grafir", priceDelta: 0, sortOrder: 0 },
                { name: "Dengan Grafir Nama", priceDelta: 15000, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const mug = await prisma.product.create({
    data: {
      name: "Mug Keramik Nusantara",
      description:
        "Mug keramik 300ml glossy dengan ilustrasi peta kopi Nusantara. Aman untuk microwave & dishwasher.",
      basePrice: 75000,
      image: IMG.mug,
      weightGram: 400,
      sortOrder: 7,
      stock: 18,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catMerch.id,
    },
  });

  const totebag = await prisma.product.create({
    data: {
      name: "Tote Bag Kanvas",
      description:
        "Tote bag kanvas tebal 12oz, sablon plastisol. Muat laptop 14 inch + botol. Edisi terbatas.",
      basePrice: 65000,
      image: IMG.totebag,
      weightGram: 250,
      sortOrder: 8,
      stock: 0,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catMerch.id,
    },
  });

  const coldBrew = await prisma.product.create({
    data: {
      name: "Cold Brew Bottle 300ml",
      description:
        "Diseduh dingin 18 jam, low acid, tanpa gula. Ready to drink, simpan di kulkas maks 5 hari. Pengiriman area Bandung.",
      basePrice: 35000,
      image: IMG.coldBrew,
      weightGram: 350,
      sortOrder: 9,
      stock: 0,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catRtd.id,
    },
  });

  const kopiSusu = await prisma.product.create({
    data: {
      name: "Kopi Susu Gula Aren 250ml",
      description:
        "Es kopi susu signature dengan gula aren asli. Manis pas, creamy. Best seller! Pengiriman area Bandung same-day.",
      basePrice: 28000,
      image: IMG.latte,
      weightGram: 300,
      sortOrder: 10,
      stock: 50,
      trackStock: true,
      tenantId: tenant.id,
      categoryId: catRtd.id,
      variantGroups: {
        create: [
          {
            name: "Level Gula",
            sortOrder: 0,
            options: {
              create: [
                { name: "Normal", priceDelta: 0, sortOrder: 0 },
                { name: "Less Sugar", priceDelta: 0, sortOrder: 1 },
                { name: "Extra Aren", priceDelta: 3000, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  const americano = await prisma.product.create({
    data: {
      name: "Americano Bottle 250ml",
      description:
        "Espresso + air, tanpa gula. Untuk pecinta kopi hitam. Ready to drink area Bandung.",
      basePrice: 25000,
      image: IMG.americano,
      weightGram: 300,
      sortOrder: 11,
      tenantId: tenant.id,
      categoryId: catRtd.id,
    },
  });

  console.log("Seeded 12 products with variants & realistic stock states.");

  // ---- Customers ------------------------------------------------------------
  const [ayu, budi, citra, dewi] = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Ayu Lestari",
        email: "ayu.lestari@gmail.com",
        whatsapp: "6281299988877",
        address: "Jl. Melati No. 7, Dago",
        province: "Jawa Barat",
        city: "Kota Bandung",
        district: "Coblong",
        postalCode: "40132",
        rajaOngkirDestinationId: "24",
        rajaOngkirDestinationLabel: "Coblong, Kota Bandung, Jawa Barat 40132",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Budi Santoso",
        email: "budi.santoso@yahoo.com",
        whatsapp: "6281355544433",
        address: "Jl. Kemang Raya No. 21",
        province: "DKI Jakarta",
        city: "Kota Jakarta Selatan",
        district: "Mampang Prapatan",
        postalCode: "12730",
        rajaOngkirDestinationId: "153",
        rajaOngkirDestinationLabel: "Mampang Prapatan, Jakarta Selatan, DKI Jakarta 12730",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Citra Handayani",
        email: "citra.h@gmail.com",
        whatsapp: "6281744422211",
        address: "Jl. Diponegoro No. 88",
        province: "Jawa Timur",
        city: "Kota Surabaya",
        district: "Gubeng",
        postalCode: "60281",
        rajaOngkirDestinationId: "444",
        rajaOngkirDestinationLabel: "Gubeng, Kota Surabaya, Jawa Timur 60281",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Dewi Anggraini",
        email: "",
        whatsapp: "6281633311100",
        address: "Jl. Pahlawan No. 5, Antapani",
        province: "Jawa Barat",
        city: "Kota Bandung",
        district: "Antapani",
        postalCode: "40291",
        rajaOngkirDestinationId: "25",
        rajaOngkirDestinationLabel: "Antapani, Kota Bandung, Jawa Barat 40291",
      },
    }),
  ]);
  console.log("Seeded 4 customers.");

  // ---- Orders + payments + ledger ------------------------------------------
  type LedgerStatus = "PENDING" | "AVAILABLE" | "SETTLED";
  type ItemInput = {
    product: { id: string; name: string; image: string; weightGram: number };
    variantName: string;
    variantSnapshot: Prisma.InputJsonValue;
    qty: number;
    unitPrice: number;
  };

  async function seedOrder(opts: {
    orderNumber: string;
    customer: {
      id: string;
      name: string;
      email: string;
      whatsapp: string;
      address: string;
      province: string;
      city: string;
      district: string;
      postalCode: string;
      rajaOngkirDestinationId: string;
      rajaOngkirDestinationLabel: string;
    };
    createdAt: Date;
    status: "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
    courier: string;
    shippingService: string;
    shippingEtd: string;
    shippingCost: number;
    items: ItemInput[];
    method?: string;
    trackingNumber?: string;
    ledgerStatus?: LedgerStatus;
    withdrawalRequestId?: string;
  }) {
    const subtotal = opts.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const platformFee = feeOf(subtotal);
    const total = subtotal + opts.shippingCost;
    const weight = opts.items.reduce((s, it) => s + it.product.weightGram * it.qty, 0);

    const paid = opts.status !== "PENDING_PAYMENT" && opts.status !== "CANCELED";
    const paidAt = paid ? new Date(opts.createdAt.getTime() + 30 * 60 * 1000) : null;
    const shippedAt =
      opts.status === "SHIPPED" || opts.status === "COMPLETED"
        ? new Date(opts.createdAt.getTime() + DAY_MS)
        : null;
    const completedAt =
      opts.status === "COMPLETED" ? new Date(opts.createdAt.getTime() + 4 * DAY_MS) : null;
    const canceledAt =
      opts.status === "CANCELED" ? new Date(opts.createdAt.getTime() + 2 * DAY_MS) : null;

    const paymentStatus =
      opts.status === "CANCELED"
        ? "CANCELED"
        : opts.status === "PENDING_PAYMENT"
          ? "PENDING"
          : "PAID";

    const order = await prisma.order.create({
      data: {
        orderNumber: opts.orderNumber,
        tenantId: tenant.id,
        customerId: opts.customer.id,
        customerName: opts.customer.name,
        customerEmail: opts.customer.email,
        customerWhatsapp: opts.customer.whatsapp,
        customerAddress: opts.customer.address,
        customerProvince: opts.customer.province,
        customerCity: opts.customer.city,
        customerDistrict: opts.customer.district,
        customerPostalCode: opts.customer.postalCode,
        rajaOngkirDestinationId: opts.customer.rajaOngkirDestinationId,
        rajaOngkirDestinationLabel: opts.customer.rajaOngkirDestinationLabel,
        subtotal,
        shippingCost: opts.shippingCost,
        platformFee,
        total,
        status: opts.status,
        courier: opts.courier,
        shippingService: opts.shippingService,
        shippingEtd: opts.shippingEtd,
        shippingWeightGram: weight,
        trackingNumber: opts.trackingNumber ?? "",
        shippedAt,
        paidAt,
        canceledAt,
        completedAt,
        createdAt: opts.createdAt,
        items: {
          create: opts.items.map((it) => ({
            productId: it.product.id,
            productName: it.product.name,
            productImage: it.product.image,
            variantName: it.variantName,
            variantSnapshot: it.variantSnapshot,
            qty: it.qty,
            unitPrice: it.unitPrice,
            totalPrice: it.unitPrice * it.qty,
            weightGram: it.product.weightGram,
            totalWeightGram: it.product.weightGram * it.qty,
          })),
        },
        payment: {
          create: {
            provider: "PAKASIR",
            pakasirOrderId: opts.orderNumber,
            amount: total,
            status: paymentStatus,
            method: paymentStatus === "PAID" ? (opts.method ?? "qris") : "",
            paidAt,
            rawPayload: { seed: true, status: paymentStatus.toLowerCase() },
          },
        },
      },
    });

    // Ledger only exists for orders that were paid.
    if (paid) {
      const availableAt = new Date(paidAt!.getTime() + WITHDRAWAL_HOLD_DAYS * DAY_MS);
      const status = opts.ledgerStatus ?? (availableAt.getTime() <= NOW ? "AVAILABLE" : "PENDING");
      await prisma.ledgerEntry.createMany({
        data: [
          {
            tenantId: tenant.id,
            orderId: order.id,
            withdrawalRequestId: opts.withdrawalRequestId ?? null,
            type: "CREDIT",
            amount: subtotal,
            availableAt,
            status,
            note: `Order ${opts.orderNumber}`,
          },
          {
            tenantId: tenant.id,
            orderId: order.id,
            withdrawalRequestId: opts.withdrawalRequestId ?? null,
            type: "FEE",
            amount: -platformFee,
            availableAt,
            status,
            note: `Fee platform order ${opts.orderNumber}`,
          },
        ],
      });
    }

    return { order, subtotal, platformFee, total };
  }

  // A withdrawal that was already paid out (settles older ledger balance).
  const paidWithdrawal = await prisma.withdrawalRequest.create({
    data: {
      tenantId: tenant.id,
      amount: 300000,
      status: "PAID",
      note: "Pencairan ke BCA •••• 4821",
      requestedAt: daysAgo(20),
      processedAt: daysAgo(19),
      createdAt: daysAgo(20),
    },
  });

  await seedOrder({
    orderNumber: "TKL-20250901-0001",
    customer: ayu,
    createdAt: daysAgo(30),
    status: "COMPLETED",
    courier: "jne",
    shippingService: "REG",
    shippingEtd: "2-3 hari",
    shippingCost: 12000,
    method: "qris",
    trackingNumber: "JNE0012345678",
    ledgerStatus: "SETTLED",
    withdrawalRequestId: paidWithdrawal.id,
    items: [
      {
        product: arabikaGayo,
        variantName: "200g / Sedang (V60)",
        variantSnapshot: [
          { groupName: "Ukuran", optionName: "200g", priceDelta: 60000 },
          { groupName: "Gilingan", optionName: "Sedang (V60)", priceDelta: 0 },
        ],
        qty: 1,
        unitPrice: 145000,
      },
      {
        product: dripBag,
        variantName: "House Blend",
        variantSnapshot: [{ groupName: "Varian Rasa", optionName: "House Blend", priceDelta: 0 }],
        qty: 1,
        unitPrice: 55000,
      },
    ],
  });

  await seedOrder({
    orderNumber: "TKL-20250905-0002",
    customer: budi,
    createdAt: daysAgo(26),
    status: "COMPLETED",
    courier: "sicepat",
    shippingService: "BEST",
    shippingEtd: "1-2 hari",
    shippingCost: 22000,
    method: "va_bca",
    trackingNumber: "SPX980012345",
    ledgerStatus: "SETTLED",
    withdrawalRequestId: paidWithdrawal.id,
    items: [
      {
        product: giftSet,
        variantName: "Arabika + Liberika / Custom Teks",
        variantSnapshot: [
          { groupName: "Pilihan Kopi", optionName: "Arabika + Liberika", priceDelta: 25000 },
          { groupName: "Kartu Ucapan", optionName: "Custom Teks", priceDelta: 0 },
        ],
        qty: 1,
        unitPrice: 190000,
      },
    ],
  });

  await seedOrder({
    orderNumber: "TKL-20250918-0003",
    customer: citra,
    createdAt: daysAgo(13),
    status: "COMPLETED",
    courier: "jnt",
    shippingService: "EZ",
    shippingEtd: "2-4 hari",
    shippingCost: 24000,
    method: "qris",
    trackingNumber: "JP1122334455",
    items: [
      {
        product: robustaLampung,
        variantName: "500g / Halus (Espresso)",
        variantSnapshot: [
          { groupName: "Ukuran", optionName: "500g", priceDelta: 120000 },
          { groupName: "Gilingan", optionName: "Halus (Espresso)", priceDelta: 0 },
        ],
        qty: 1,
        unitPrice: 185000,
      },
      {
        product: tumbler,
        variantName: "Hitam Doff / Dengan Grafir Nama",
        variantSnapshot: [
          { groupName: "Warna", optionName: "Hitam Doff", priceDelta: 0 },
          { groupName: "Grafir Nama", optionName: "Dengan Grafir Nama", priceDelta: 15000 },
        ],
        qty: 1,
        unitPrice: 160000,
      },
    ],
  });

  await seedOrder({
    orderNumber: "TKL-20250926-0004",
    customer: dewi,
    createdAt: daysAgo(5),
    status: "SHIPPED",
    courier: "anteraja",
    shippingService: "REG",
    shippingEtd: "1-2 hari",
    shippingCost: 10000,
    method: "qris",
    trackingNumber: "AJ7788990011",
    items: [
      {
        product: kopiSusu,
        variantName: "Extra Aren",
        variantSnapshot: [{ groupName: "Level Gula", optionName: "Extra Aren", priceDelta: 3000 }],
        qty: 3,
        unitPrice: 31000,
      },
      {
        product: espressoBlend,
        variantName: "Halus (Espresso)",
        variantSnapshot: [{ groupName: "Gilingan", optionName: "Halus (Espresso)", priceDelta: 0 }],
        qty: 1,
        unitPrice: 78000,
      },
    ],
  });

  await seedOrder({
    orderNumber: "TKL-20250929-0005",
    customer: ayu,
    createdAt: daysAgo(2),
    status: "PAID",
    courier: "jne",
    shippingService: "YES",
    shippingEtd: "1 hari",
    shippingCost: 18000,
    method: "va_bni",
    items: [
      {
        product: liberika,
        variantName: "200g",
        variantSnapshot: [{ groupName: "Ukuran", optionName: "200g", priceDelta: 80000 }],
        qty: 1,
        unitPrice: 190000,
      },
    ],
  });

  await seedOrder({
    orderNumber: "TKL-20250930-0006",
    customer: budi,
    createdAt: daysAgo(1),
    status: "PENDING_PAYMENT",
    courier: "pos",
    shippingService: "Kilat Khusus",
    shippingEtd: "2-3 hari",
    shippingCost: 20000,
    items: [
      {
        product: dripBag,
        variantName: "Mix (5+5)",
        variantSnapshot: [{ groupName: "Varian Rasa", optionName: "Mix (5+5)", priceDelta: 5000 }],
        qty: 2,
        unitPrice: 60000,
      },
    ],
  });

  await seedOrder({
    orderNumber: "TKL-20250928-0007",
    customer: citra,
    createdAt: daysAgo(3),
    status: "CANCELED",
    courier: "jnt",
    shippingService: "EZ",
    shippingEtd: "2-4 hari",
    shippingCost: 24000,
    items: [
      {
        product: mug,
        variantName: "",
        variantSnapshot: [],
        qty: 2,
        unitPrice: 75000,
      },
    ],
  });

  console.log("Seeded 7 orders (completed/shipped/paid/pending/canceled) with payments & ledger.");

  // Pending withdrawal request against currently-available balance.
  const requestedWithdrawal = await prisma.withdrawalRequest.create({
    data: {
      tenantId: tenant.id,
      amount: 150000,
      status: "REQUESTED",
      note: "Pencairan ke BCA •••• 4821",
      requestedAt: daysAgo(1, 14),
      createdAt: daysAgo(1, 14),
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      tenantId: tenant.id,
      withdrawalRequestId: requestedWithdrawal.id,
      type: "WITHDRAWAL",
      amount: -150000,
      availableAt: daysAgo(1, 14),
      status: "PENDING",
      note: `Withdrawal request ${requestedWithdrawal.id}`,
    },
  });
  console.log("Seeded withdrawals (1 paid/settled, 1 requested/pending).");

  // ---- Analytics ------------------------------------------------------------
  const events: { event: string; base: number; jitter: number }[] = [
    { event: "storefront_view", base: 45, jitter: 40 },
    { event: "product_click", base: 18, jitter: 16 },
    { event: "checkout_started", base: 4, jitter: 5 },
    { event: "whatsapp_click", base: 6, jitter: 6 },
    { event: "storefront_share_click", base: 2, jitter: 3 },
  ];
  const analyticsRows: Prisma.AnalyticsDailyCreateManyInput[] = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date(daysAgo(d));
    date.setHours(0, 0, 0, 0);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    for (const e of events) {
      const mult = weekend ? 1.4 : 1;
      const count = Math.max(0, Math.round((e.base + (Math.random() * 2 - 1) * e.jitter) * mult));
      analyticsRows.push({ tenantId: tenant.id, date, event: e.event, count });
    }
  }
  await prisma.analyticsDaily.createMany({ data: analyticsRows });
  console.log(`Seeded ${analyticsRows.length} analytics rows across 30 days.`);

  console.log("Database seeding complete!");
  console.log(`   Storefront: /${tenant.slug}`);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
