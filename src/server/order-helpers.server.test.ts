import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("./email", () => ({
  sendOrderReceiptEmail: vi.fn(async () => undefined),
  sendTenantOrderNotificationEmail: vi.fn(async () => undefined),
}));

import { prisma } from "../db";
import { markOrderCanceled, markOrderPaid } from "./order-helpers.server";

const prismaAny = prisma as any;
const baseOrder = {
  id: "order-1",
  tenantId: "tenant-1",
  orderNumber: "TL1",
  subtotal: 20000,
  platformFee: 300,
  total: 22000,
  status: "PENDING_PAYMENT",
  customerEmail: "budi@example.com",
  payment: { id: "payment-1", status: "PENDING" },
};

function makeTx(order = baseOrder, updateCount = 1, items: unknown[] = []) {
  return {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        ...order,
        status: "PAID",
        items,
        tenant: { user: { email: "tenant@example.com" } },
      }),
    },
    payment: { update: vi.fn() },
    ledgerEntry: { createMany: vi.fn() },
    product: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe("markOrderPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates pending order conditionally and creates ledger with duplicate guard", async () => {
    const tx = makeTx();
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderPaid("TL1", { ok: true }, "qris")).resolves.toMatchObject({
      status: "PAID",
    });

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "PENDING_PAYMENT" },
      data: { status: "PAID", paidAt: expect.any(Date) },
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { orderId: "order-1", status: "PENDING" },
      data: expect.objectContaining({ status: "PAID", method: "qris" }),
    });
    expect(tx.ledgerEntry.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("does not double-credit already paid order", async () => {
    const tx = makeTx({ ...baseOrder, status: "PAID" });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderPaid("TL1", { duplicate: true })).resolves.toMatchObject({
      status: "PAID",
    });

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it("does not create ledger when concurrent webhook already changed state", async () => {
    const tx = makeTx(baseOrder, 0);
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderPaid("TL1", { duplicate: true })).resolves.toMatchObject({
      status: "PENDING_PAYMENT",
    });

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it("decrements stock only for tracked products and clamps at zero", async () => {
    const tx = makeTx(baseOrder, 1, [
      { productId: "p1", qty: 3, product: { trackStock: true, stock: 2 } },
      { productId: "p2", qty: 1, product: { trackStock: false, stock: 10 } },
      { productId: "p3", qty: 1, product: null },
    ]);
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderPaid("TL1", { ok: true }, "qris")).resolves.toMatchObject({
      status: "PAID",
    });

    expect(tx.product.update).toHaveBeenCalledTimes(1);
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stock: { decrement: 3 } },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1"] }, stock: { lt: 0 } },
      data: { stock: 0 },
    });
  });

  it("skips stock decrement entirely when no items track stock", async () => {
    const tx = makeTx(baseOrder, 1, [
      { productId: "p1", qty: 1, product: { trackStock: false, stock: null } },
    ]);
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderPaid("TL1", { ok: true }, "qris")).resolves.toMatchObject({
      status: "PAID",
    });

    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it("does not fail order paid flow when notification emails fail (fire-and-forget)", async () => {
    const tx = makeTx();
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const { sendOrderReceiptEmail, sendTenantOrderNotificationEmail } = await import("./email");
    vi.mocked(sendOrderReceiptEmail).mockRejectedValueOnce(new Error("resend down"));
    vi.mocked(sendTenantOrderNotificationEmail).mockRejectedValueOnce(new Error("resend down"));

    await expect(markOrderPaid("TL1", { ok: true }, "qris")).resolves.toMatchObject({
      status: "PAID",
    });
  });

  it("throws when order is not found", async () => {
    const tx = { order: { findUnique: vi.fn().mockResolvedValue(null) } };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderPaid("UNKNOWN", {})).rejects.toThrow("Order tidak ditemukan");
  });

  it("skips notification emails when paid order has no customer email or tenant user", async () => {
    const tx = makeTx();
    tx.order.findUniqueOrThrow = vi.fn().mockResolvedValue({
      ...baseOrder,
      status: "PAID",
      items: [],
      customerEmail: null,
      tenant: { user: null },
    });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const { sendOrderReceiptEmail, sendTenantOrderNotificationEmail } = await import("./email");

    await expect(markOrderPaid("TL1", { ok: true }, "qris")).resolves.toMatchObject({
      status: "PAID",
    });

    expect(sendOrderReceiptEmail).not.toHaveBeenCalled();
    expect(sendTenantOrderNotificationEmail).not.toHaveBeenCalled();
  });
});

describe("markOrderCanceled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when order is not found", async () => {
    const tx = { order: { findUnique: vi.fn().mockResolvedValue(null) } };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderCanceled("UNKNOWN", {})).rejects.toThrow("Order tidak ditemukan");
  });

  it("returns order as-is when order is not pending payment", async () => {
    const order = { ...baseOrder, status: "PAID" };
    const tx = {
      order: { findUnique: vi.fn().mockResolvedValue(order) },
      payment: { update: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderCanceled("TL1", {})).resolves.toEqual(order);
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it("cancels pending payment order and marks payment canceled", async () => {
    const order = { ...baseOrder, status: "PENDING_PAYMENT" };
    const canceledOrder = { ...order, status: "CANCELED", canceledAt: new Date() };
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue(order),
        update: vi.fn().mockResolvedValue(canceledOrder),
      },
      payment: { update: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(markOrderCanceled("TL1", { reason: "expired" })).resolves.toEqual(canceledOrder);

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { orderId: "order-1" },
      data: expect.objectContaining({ status: "CANCELED" }),
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({ status: "CANCELED" }),
    });
  });
});
