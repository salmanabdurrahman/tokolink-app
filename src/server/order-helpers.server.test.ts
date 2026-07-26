import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("./email", () => ({
  sendOrderReceiptEmail: vi.fn(async () => undefined),
  sendTenantOrderNotificationEmail: vi.fn(async () => undefined),
}));

import { prisma } from "../db";
import { markOrderPaid } from "./order-helpers.server";

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

function makeTx(order = baseOrder, updateCount = 1) {
  return {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        ...order,
        status: "PAID",
        items: [],
        tenant: { user: { email: "tenant@example.com" } },
      }),
    },
    payment: { update: vi.fn() },
    ledgerEntry: { createMany: vi.fn() },
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
});
