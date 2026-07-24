import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    payment: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("./pakasir", () => ({
  buildPakasirPayUrl: vi.fn(() => "https://pay.test/TL"),
  createPakasirTransaction: vi.fn(async () => ({
    payment: { payment_method: "qris", payment_url: "https://pay.test/TL" },
  })),
}));

vi.mock("./order-helpers.server", () => ({ markOrderCanceled: vi.fn(async () => undefined) }));
vi.mock("./rajaongkir", () => ({ calculateDomesticCost: vi.fn() }));

import { prisma } from "../db";
import { markOrderCanceled } from "./order-helpers.server";
import { createPakasirTransaction } from "./pakasir";
import { calculateDomesticCost } from "./rajaongkir";
import { createCheckoutOrderData } from "./checkout.server";

const prismaAny = prisma as any;
const productId = "11111111-1111-4111-8111-111111111111";
const optionId = "22222222-2222-4222-8222-222222222222";

const checkoutInput = {
  tenantSlug: "kopi-ibu",
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
};

function mockTenant(weightGram = 500) {
  vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({
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
        weightGram,
        variantGroups: [
          {
            name: "Ukuran",
            options: [{ id: optionId, name: "Large", priceDelta: 2000 }],
          },
        ],
      },
    ],
  });
}

describe("createCheckoutOrderData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenant();
    vi.mocked(calculateDomesticCost).mockResolvedValue([
      { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
    ]);
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) =>
      callback({
        customer: { create: vi.fn().mockResolvedValue({ id: "customer-1" }) },
        order: {
          create: vi.fn().mockResolvedValue({
            id: "order-1",
            orderNumber: "TL1",
            total: 36000,
            payment: { id: "payment-1" },
          }),
        },
      }),
    );
    vi.mocked(prismaAny.payment.update).mockResolvedValue({});
  });

  it("re-queries RajaOngkir and stores matched quote snapshot", async () => {
    const orderCreate = vi.fn().mockResolvedValue({
      id: "order-1",
      orderNumber: "TL1",
      total: 36000,
      payment: { id: "payment-1" },
    });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) =>
      callback({
        customer: { create: vi.fn().mockResolvedValue({ id: "customer-1" }) },
        order: { create: orderCreate },
      }),
    );

    await expect(createCheckoutOrderData(checkoutInput)).resolves.toMatchObject({ total: 36000 });

    expect(calculateDomesticCost).toHaveBeenCalledWith({
      origin: "origin-1",
      destination: "dest-1",
      weight: 1000,
      couriers: ["jne"],
    });
    expect(orderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 24000,
        shippingCost: 12000,
        platformFee: 360,
        total: 36000,
        shippingService: "REG",
        shippingEtd: "1-2",
        shippingWeightGram: 1000,
        items: {
          create: [
            expect.objectContaining({
              productName: "Kopi Susu",
              variantName: "Ukuran: Large",
              qty: 2,
              unitPrice: 12000,
              totalPrice: 24000,
              weightGram: 500,
              totalWeightGram: 1000,
              variantSnapshot: [
                expect.objectContaining({
                  id: optionId,
                  groupName: "Ukuran",
                  name: "Large",
                  priceDelta: 2000,
                }),
              ],
            }),
          ],
        },
      }),
      include: { payment: true },
    });
  });

  it("rejects tampered shipping cost", async () => {
    await expect(
      createCheckoutOrderData({
        ...checkoutInput,
        shipping: { ...checkoutInput.shipping, cost: 1 },
      }),
    ).rejects.toThrow("Pilihan ongkir tidak valid");
  });

  it("rejects fake shipping service", async () => {
    await expect(
      createCheckoutOrderData({
        ...checkoutInput,
        shipping: { ...checkoutInput.shipping, service: "PALSU" },
      }),
    ).rejects.toThrow("Pilihan ongkir tidak valid");
  });

  it("rejects changed destination quote", async () => {
    vi.mocked(calculateDomesticCost).mockResolvedValueOnce([]);

    await expect(
      createCheckoutOrderData({
        ...checkoutInput,
        customer: { ...checkoutInput.customer, rajaOngkirDestinationId: "dest-2" },
      }),
    ).rejects.toThrow("Pilihan ongkir tidak valid");
  });

  it("rejects stale item weight quote", async () => {
    mockTenant(800);
    vi.mocked(calculateDomesticCost).mockResolvedValueOnce([
      { courier: "jne", service: "REG", description: "Regular", cost: 15000, etd: "1-2" },
    ]);

    await expect(createCheckoutOrderData(checkoutInput)).rejects.toThrow(
      "Pilihan ongkir tidak valid",
    );
    expect(calculateDomesticCost).toHaveBeenCalledWith(expect.objectContaining({ weight: 1600 }));
  });

  it("cancels pending order when Pakasir transaction creation fails", async () => {
    vi.mocked(createPakasirTransaction).mockRejectedValueOnce(new Error("Pakasir down"));

    await expect(createCheckoutOrderData(checkoutInput)).rejects.toThrow("Pakasir down");

    expect(markOrderCanceled).toHaveBeenCalledWith("TL1", { reason: "pakasir_create_failed" });
  });
});
