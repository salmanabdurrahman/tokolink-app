import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: { tenant: { findUnique: vi.fn() } },
}));
vi.mock("./rajaongkir", () => ({
  calculateDomesticCost: vi.fn(),
  searchDomesticDestination: vi.fn(),
  trackWaybill: vi.fn(),
}));

import { prisma } from "../db";
import { calculateDomesticCost } from "./rajaongkir";
import { calculateShippingWeightGram, getRajaOngkirShippingCosts } from "./shipping.functions";

const prismaAny = prisma as any;
const handler = getRajaOngkirShippingCosts as any;

const input = {
  tenantSlug: "kopi-ibu",
  destinationId: "dest-1",
  items: [
    { productId: "11111111-1111-4111-8111-111111111111", qty: 2 },
    { productId: "22222222-2222-4222-8222-222222222222", qty: 1 },
  ],
};

function mockTenant(overrides: Record<string, unknown> = {}) {
  vi.mocked(prismaAny.tenant.findUnique).mockResolvedValue({
    id: "tenant-1",
    slug: "kopi-ibu",
    rajaOngkirOriginId: "origin-1",
    allowedCouriers: ["jne", "jnt"],
    products: [
      { id: input.items[0].productId, weightGram: 250 },
      { id: input.items[1].productId, weightGram: 500 },
    ],
    ...overrides,
  });
}

describe("shipping functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenant();
    vi.mocked(calculateDomesticCost).mockResolvedValue([
      { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
    ]);
  });

  it("calculates minimum total weight from product weights and qty", () => {
    expect(calculateShippingWeightGram([{ weightGram: 0, qty: 2 }])).toBe(2);
    expect(calculateShippingWeightGram([{ weightGram: 250, qty: 2 }, { weightGram: 500, qty: 1 }])).toBe(1000);
  });

  it("requires tenant origin before quoting shipping", async () => {
    mockTenant({ rajaOngkirOriginId: null });

    await expect(handler({ data: input })).rejects.toThrow(
      "Toko belum mengatur origin pengiriman",
    );
    expect(calculateDomesticCost).not.toHaveBeenCalled();
  });

  it("uses tenant allowed couriers and calculated weight", async () => {
    await expect(handler({ data: input })).resolves.toMatchObject({
      weightGram: 1000,
      options: [{ courier: "jne", service: "REG" }],
    });

    expect(calculateDomesticCost).toHaveBeenCalledWith({
      origin: "origin-1",
      destination: "dest-1",
      weight: 1000,
      couriers: ["jne", "jnt"],
    });
  });

  it("falls back to default couriers when tenant has none", async () => {
    mockTenant({ allowedCouriers: [] });

    await handler({ data: input });

    expect(calculateDomesticCost).toHaveBeenCalledWith(
      expect.objectContaining({ couriers: ["jne", "jnt", "sicepat", "anteraja", "pos", "tiki", "ninja"] }),
    );
  });

  it("rejects unavailable route with user-facing error", async () => {
    vi.mocked(calculateDomesticCost).mockResolvedValueOnce([]);

    await expect(handler({ data: input })).rejects.toThrow(
      "Layanan pengiriman untuk rute ini belum tersedia",
    );
  });

  it("propagates provider error", async () => {
    vi.mocked(calculateDomesticCost).mockRejectedValueOnce(new Error("RajaOngkir timeout"));

    await expect(handler({ data: input })).rejects.toThrow("RajaOngkir timeout");
  });
});
