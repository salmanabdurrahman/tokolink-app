import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("./rajaongkir", () => ({ calculateDomesticCost: vi.fn() }));

import { prisma } from "../db";
import { calculateDomesticCost } from "./rajaongkir";
import {
  buildCheckoutOrderItems,
  cartRequiresShipping,
  createCheckoutOrderRecord,
  validateCheckoutShippingQuote,
  validateCheckoutTenant,
} from "./checkout.service.server";

const prismaAny = prisma as any;
const productId = "11111111-1111-4111-8111-111111111111";
const optionId = "22222222-2222-4222-8222-222222222222";

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: "tenant-1",
    slug: "kopi-ibu",
    rajaOngkirOriginId: "origin-1",
    allowedCouriers: ["jne"],
    products: [
      {
        id: productId,
        name: "Kopi Susu",
        image: "",
        basePrice: 10000,
        weightGram: 500,
        variantGroups: [
          { name: "Ukuran", options: [{ id: optionId, name: "Large", priceDelta: 2000 }] },
        ],
      },
    ],
    ...overrides,
  } as any;
}

function makeCheckoutInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId, variantOptionIds: [optionId], qty: 2 }],
    customer: {
      name: "Budi",
      email: "budi@example.com",
      whatsapp: "6281234567890",
      address: "Jl. Melati 1",
      province: "DKI Jakarta",
      city: "Jakarta Selatan",
      district: "Kebayoran Baru",
      postalCode: "12110",
      rajaOngkirDestinationId: "dest-1",
      rajaOngkirDestinationLabel: "Senayan, Jakarta Selatan",
    },
    shipping: { courier: "jne", service: "REG", etd: "1-2", cost: 12000 },
    ...overrides,
  } as any;
}

describe("validateCheckoutTenant", () => {
  it("throws when tenant is null", () => {
    expect(() => validateCheckoutTenant(null, makeCheckoutInput(), true)).toThrow(
      "Toko tidak ditemukan",
    );
  });

  it("throws when tenant has no shipping origin", () => {
    expect(() =>
      validateCheckoutTenant(makeTenant({ rajaOngkirOriginId: null }), makeCheckoutInput(), true),
    ).toThrow("Toko belum mengatur origin pengiriman. Hubungi penjual.");
  });

  it("throws when destination is missing", () => {
    expect(() =>
      validateCheckoutTenant(
        makeTenant(),
        makeCheckoutInput({
          customer: { ...makeCheckoutInput().customer, rajaOngkirDestinationId: "" },
        }),
        true,
      ),
    ).toThrow("Tujuan pengiriman harus dipilih");
  });

  it("throws when courier is not allowed for tenant", () => {
    expect(() =>
      validateCheckoutTenant(makeTenant({ allowedCouriers: ["jnt"] }), makeCheckoutInput(), true),
    ).toThrow("Kurir tidak tersedia untuk toko ini");
  });

  it("throws when some products are not found for tenant", () => {
    expect(() =>
      validateCheckoutTenant(makeTenant({ products: [] }), makeCheckoutInput(), true),
    ).toThrow("Sebagian produk tidak ditemukan");
  });

  it("passes for a valid tenant/input pair", () => {
    expect(() => validateCheckoutTenant(makeTenant(), makeCheckoutInput(), true)).not.toThrow();
  });

  it("skips shipping checks for a digital-only cart", () => {
    const tenant = makeTenant({
      rajaOngkirOriginId: "",
      products: [
        {
          id: productId,
          name: "E-book",
          image: "",
          basePrice: 10000,
          weightGram: 1,
          isDigital: true,
          variantGroups: [],
        },
      ],
    });
    const input = makeCheckoutInput({
      items: [{ productId, variantOptionIds: [], qty: 1 }],
      customer: { ...makeCheckoutInput().customer, address: "", rajaOngkirDestinationId: "" },
      shipping: undefined,
    });

    expect(cartRequiresShipping(tenant)).toBe(false);
    expect(() => validateCheckoutTenant(tenant, input, false)).not.toThrow();
  });

  it("throws when requested qty exceeds tracked stock", () => {
    const tenant = makeTenant({
      products: [
        {
          id: productId,
          name: "Kopi Susu",
          image: "",
          basePrice: 10000,
          weightGram: 500,
          trackStock: true,
          stock: 1,
          variantGroups: [
            { name: "Ukuran", options: [{ id: optionId, name: "Large", priceDelta: 2000 }] },
          ],
        },
      ],
    });

    expect(() => validateCheckoutTenant(tenant, makeCheckoutInput(), true)).toThrow(
      'Stok "Kopi Susu" tidak cukup. Sisa stok: 1',
    );
  });

  it("allows checkout when product does not track stock", () => {
    const tenant = makeTenant({
      products: [
        {
          id: productId,
          name: "Kopi Susu",
          image: "",
          basePrice: 10000,
          weightGram: 500,
          trackStock: false,
          stock: null,
          variantGroups: [
            { name: "Ukuran", options: [{ id: optionId, name: "Large", priceDelta: 2000 }] },
          ],
        },
      ],
    });

    expect(() => validateCheckoutTenant(tenant, makeCheckoutInput(), true)).not.toThrow();
  });
});

describe("buildCheckoutOrderItems", () => {
  it("builds order items with variant snapshot and computed totals", () => {
    const items = buildCheckoutOrderItems(makeTenant(), makeCheckoutInput());

    expect(items).toEqual([
      expect.objectContaining({
        productId,
        productName: "Kopi Susu",
        variantName: "Ukuran: Large",
        qty: 2,
        unitPrice: 12000,
        totalPrice: 24000,
        weightGram: 500,
        totalWeightGram: 1000,
      }),
    ]);
  });

  it("throws when a requested product is not part of the tenant catalog", () => {
    expect(() =>
      buildCheckoutOrderItems(makeTenant({ products: [] }), makeCheckoutInput()),
    ).toThrow("Produk tidak ditemukan");
  });

  it("throws when a variant option id does not exist on the product", () => {
    expect(() =>
      buildCheckoutOrderItems(
        makeTenant(),
        makeCheckoutInput({
          items: [{ productId, variantOptionIds: ["does-not-exist"], qty: 1 }],
        }),
      ),
    ).toThrow("Varian Kopi Susu tidak valid");
  });

  it("assigns zero shipping weight to a digital product", () => {
    const items = buildCheckoutOrderItems(
      makeTenant({
        products: [
          {
            id: productId,
            name: "E-book",
            image: "",
            basePrice: 10000,
            weightGram: 500,
            isDigital: true,
            variantGroups: [],
          },
        ],
      }),
      makeCheckoutInput({ items: [{ productId, variantOptionIds: [], qty: 3 }] }),
    );

    expect(items[0]).toMatchObject({ weightGram: 0, totalWeightGram: 0 });
  });

  it("falls back to a minimum weight of 1 gram when product weight is unset", () => {
    const items = buildCheckoutOrderItems(
      makeTenant({
        products: [
          {
            id: productId,
            name: "Kopi Susu",
            image: "",
            basePrice: 10000,
            weightGram: 0,
            variantGroups: [],
          },
        ],
      }),
      makeCheckoutInput({ items: [{ productId, variantOptionIds: [], qty: 3 }] }),
    );

    expect(items[0]).toMatchObject({ weightGram: 1, totalWeightGram: 3 });
  });
});

describe("validateCheckoutShippingQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when calculated weight is below 1 gram", async () => {
    await expect(
      validateCheckoutShippingQuote(makeTenant(), makeCheckoutInput(), 0),
    ).rejects.toThrow("Berat pengiriman tidak valid");
    expect(calculateDomesticCost).not.toHaveBeenCalled();
  });

  it("throws when no RajaOngkir option matches the submitted shipping snapshot", async () => {
    vi.mocked(calculateDomesticCost).mockResolvedValue([
      { courier: "jne", service: "REG", description: "Regular", cost: 99999, etd: "1-2" },
    ]);

    await expect(
      validateCheckoutShippingQuote(makeTenant(), makeCheckoutInput(), 1000),
    ).rejects.toThrow("Pilihan ongkir tidak valid. Silakan hitung ulang ongkir.");
  });

  it("returns the matched shipping option using case-insensitive comparison", async () => {
    vi.mocked(calculateDomesticCost).mockResolvedValue([
      { courier: "JNE", service: "reg", description: "Regular", cost: 12000, etd: "1-2" },
    ]);

    await expect(
      validateCheckoutShippingQuote(makeTenant(), makeCheckoutInput(), 1000),
    ).resolves.toMatchObject({ cost: 12000 });
    expect(calculateDomesticCost).toHaveBeenCalledWith({
      origin: "origin-1",
      destination: "dest-1",
      weight: 1000,
      couriers: ["jne"],
    });
  });
});

describe("createCheckoutOrderRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the customer then the order inside a single transaction", async () => {
    const customerCreate = vi.fn().mockResolvedValue({ id: "customer-1" });
    const orderCreate = vi.fn().mockResolvedValue({
      id: "order-1",
      orderNumber: "TL1",
      total: 36000,
      payment: { id: "payment-1" },
    });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) =>
      callback({ customer: { create: customerCreate }, order: { create: orderCreate } }),
    );

    const result = await createCheckoutOrderRecord({
      tenant: makeTenant(),
      data: makeCheckoutInput(),
      orderItems: buildCheckoutOrderItems(makeTenant(), makeCheckoutInput()),
      subtotal: 24000,
      shippingCost: 12000,
      platformFee: 360,
      total: 36360,
      orderNumber: "TL1",
      paymentUrl: "https://pay.test/TL1",
      shippingService: "REG",
      shippingEtd: "1-2",
      calculatedWeight: 1000,
    });

    expect(result).toMatchObject({ orderNumber: "TL1", total: 36000 });
    expect(customerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tenant-1", name: "Budi" }),
    });
    expect(orderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderNumber: "TL1",
        tenantId: "tenant-1",
        customerId: "customer-1",
        status: "PENDING_PAYMENT",
        payment: {
          create: expect.objectContaining({
            pakasirOrderId: "TL1",
            amount: 36360,
            status: "PENDING",
          }),
        },
      }),
      include: { payment: true },
    });
  });
});
