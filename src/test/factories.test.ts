import { describe, expect, it, vi } from "vitest";
import {
  makeCartItem,
  makeLink,
  makePrismaMockModel,
  makePrismaOrder,
  makePrismaPayment,
  makePrismaTenant,
  makeProduct,
  makeTenant,
  makeUser,
  makeVariantGroup,
  makeVariantOption,
} from "./factories";

describe("test factories", () => {
  it("creates consistent default data for core app layers", () => {
    const user = makeUser();
    const tenant = makeTenant();
    const product = makeProduct();
    const link = makeLink();
    const variantGroup = makeVariantGroup();
    const variantOption = makeVariantOption();
    const cartItem = makeCartItem();

    expect(user.email).toBe("owner@example.com");
    expect(tenant.products).toHaveLength(1);
    expect(product.variantGroups).toHaveLength(1);
    expect(link.url).toContain("instagram.com");
    expect(variantGroup.options).toHaveLength(1);
    expect(variantOption.priceDelta).toBe(0);
    expect(cartItem.unitPrice * cartItem.qty).toBe(25000);
  });

  it("creates Prisma-shaped fixtures with sensible overrides", () => {
    const prismaTenant = makePrismaTenant({ name: "Toko Lain" });
    const prismaPayment = makePrismaPayment({ status: "PAID" });
    const prismaOrder = makePrismaOrder({ status: "COMPLETED" });

    expect(prismaTenant.name).toBe("Toko Lain");
    expect(prismaTenant.products).toHaveLength(1);
    expect(prismaOrder.status).toBe("COMPLETED");
    expect(prismaOrder.payment.status).toBe("PENDING");
    expect(prismaPayment.status).toBe("PAID");
  });

  it("creates a Prisma mock model with jest-like mock methods for every CRUD operation", () => {
    const model = makePrismaMockModel();

    expect(vi.isMockFunction(model.findUnique)).toBe(true);
    expect(vi.isMockFunction(model.findUniqueOrThrow)).toBe(true);
    expect(vi.isMockFunction(model.findFirst)).toBe(true);
    expect(vi.isMockFunction(model.findMany)).toBe(true);
    expect(vi.isMockFunction(model.create)).toBe(true);
    expect(vi.isMockFunction(model.createMany)).toBe(true);
    expect(vi.isMockFunction(model.update)).toBe(true);
    expect(vi.isMockFunction(model.updateMany)).toBe(true);
    expect(vi.isMockFunction(model.upsert)).toBe(true);
    expect(vi.isMockFunction(model.delete)).toBe(true);
    expect(vi.isMockFunction(model.deleteMany)).toBe(true);
    expect(vi.isMockFunction(model.count)).toBe(true);
  });
});
