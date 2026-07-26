import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    payment: { update: vi.fn() },
    $transaction: vi.fn(async (callback) =>
      callback({
        payment: { update: vi.fn() },
        order: { update: vi.fn() },
      }),
    ),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./pakasir", () => ({
  buildPakasirPayUrl: vi.fn(),
  createPakasirTransaction: vi.fn(),
}));
vi.mock("./email", () => ({
  sendOrderReceiptEmail: vi.fn(),
  sendTenantOrderNotificationEmail: vi.fn(),
}));

import { prisma } from "../db";
import {
  getOrderStatus,
  getTenantOrder,
  getTenantOrderCount,
  getTenantOrders,
  updateOrderTracking,
  updateTenantOrderStatus,
} from "./order.functions";

const prismaAny = prisma as any;
const tenantContext = { tenant: { id: "tenant-1" } };
const noTenantContext = { user: { id: "user-1" } };
const orderId = "11111111-1111-4111-8111-111111111111";

const getOrderStatusHandler = getOrderStatus as any;
const getTenantOrdersHandler = getTenantOrders as any;
const getTenantOrderCountHandler = getTenantOrderCount as any;
const getTenantOrderHandler = getTenantOrder as any;
const updateOrderTrackingHandler = updateOrderTracking as any;
const updateTenantOrderStatusHandler = updateTenantOrderStatus as any;

describe("tenant order dashboard functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public order status without email/address and masks tracking", async () => {
    vi.mocked(prismaAny.order.findUnique).mockResolvedValue({
      orderNumber: "TL1",
      customerName: "Budi",
      subtotal: 10000,
      shippingCost: 12000,
      total: 22000,
      status: "SHIPPED",
      courier: "jne",
      shippingService: "REG",
      trackingNumber: "JNE123456789",
      tenant: { name: "Kopi Ibu", whatsapp: "6281234567890" },
      payment: { status: "PAID", rawPayload: {} },
      items: [],
    });

    await expect(getOrderStatusHandler({ data: "TL1" })).resolves.toMatchObject({
      trackingNumber: "JNE••••789",
      payment: { status: "PAID", paymentUrl: "" },
    });

    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: { orderNumber: "TL1" },
      select: expect.not.objectContaining({ customerEmail: true, customerAddress: true }),
    });
  });

  it("lists orders scoped to tenant with payment and items", async () => {
    vi.mocked(prismaAny.order.findMany).mockResolvedValue([{ id: orderId }]);

    await expect(getTenantOrdersHandler({ context: tenantContext })).resolves.toEqual([
      { id: orderId },
    ]);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      orderBy: { createdAt: "desc" },
      include: { items: true, payment: true },
      take: 50,
    });
  });

  it("counts paid orders scoped to tenant for dashboard badge", async () => {
    vi.mocked(prismaAny.order.count).mockResolvedValue(3);

    await expect(getTenantOrderCountHandler({ context: tenantContext })).resolves.toBe(3);

    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", status: "PAID" },
    });
  });

  it("rejects reading another tenant order", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue(null);

    await expect(getTenantOrderHandler({ data: orderId, context: tenantContext })).rejects.toThrow(
      "Order tidak ditemukan",
    );

    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: orderId, tenantId: "tenant-1" },
      include: { items: true, payment: true, ledgerEntries: true },
    });
  });

  it("rejects tracking update for another tenant order", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue(null);

    await expect(
      updateOrderTrackingHandler({
        data: { orderId, courier: "jne", trackingNumber: "TK12345" },
        context: tenantContext,
      }),
    ).rejects.toThrow("Order tidak ditemukan");

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("updates tracking for a paid order and marks it shipped", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "PAID",
      shippedAt: null,
    });
    vi.mocked(prismaAny.order.update).mockResolvedValue({ id: orderId, status: "SHIPPED" });

    await expect(
      updateOrderTrackingHandler({
        data: { orderId, courier: "jne", trackingNumber: "TK12345" },
        context: tenantContext,
      }),
    ).resolves.toMatchObject({ status: "SHIPPED" });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: {
        courier: "jne",
        trackingNumber: "TK12345",
        status: "SHIPPED",
        shippedAt: expect.any(Date),
      },
    });
  });

  it("keeps existing shippedAt when tracking is updated again for an already shipped order", async () => {
    const shippedAt = new Date("2024-01-01T00:00:00.000Z");
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "SHIPPED",
      shippedAt,
    });
    vi.mocked(prismaAny.order.update).mockResolvedValue({ id: orderId, status: "SHIPPED" });

    await expect(
      updateOrderTrackingHandler({
        data: { orderId, courier: "jne", trackingNumber: "TK99999" },
        context: tenantContext,
      }),
    ).resolves.toMatchObject({ status: "SHIPPED" });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: expect.objectContaining({ shippedAt }),
    });
  });

  it("rejects tracking update when order is not yet paid", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "PENDING_PAYMENT",
      shippedAt: null,
    });

    await expect(
      updateOrderTrackingHandler({
        data: { orderId, courier: "jne", trackingNumber: "TK12345" },
        context: tenantContext,
      }),
    ).rejects.toThrow("Resi hanya bisa diisi setelah order dibayar");

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("rejects completing an order that has not been shipped", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "PAID",
    });

    await expect(
      updateTenantOrderStatusHandler({
        data: { orderId, status: "COMPLETED" },
        context: tenantContext,
      }),
    ).rejects.toThrow("Order hanya bisa diselesaikan setelah dikirim");

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("rejects canceling an order that is already paid", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "PAID",
    });

    await expect(
      updateTenantOrderStatusHandler({
        data: { orderId, status: "CANCELED" },
        context: tenantContext,
      }),
    ).rejects.toThrow("Hanya order belum dibayar yang bisa dibatalkan");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("marks shipped order completed", async () => {
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "SHIPPED",
    });
    vi.mocked(prismaAny.order.update).mockResolvedValue({ id: orderId, status: "COMPLETED" });

    await expect(
      updateTenantOrderStatusHandler({
        data: { orderId, status: "COMPLETED" },
        context: tenantContext,
      }),
    ).resolves.toMatchObject({ status: "COMPLETED" });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: expect.any(Date) },
    });
  });

  it("cancels only unpaid tenant order", async () => {
    const tx = {
      payment: { update: vi.fn() },
      order: { update: vi.fn().mockResolvedValue({ id: orderId, status: "CANCELED" }) },
    };
    vi.mocked(prismaAny.order.findFirst).mockResolvedValue({
      id: orderId,
      tenantId: "tenant-1",
      status: "PENDING_PAYMENT",
    });
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      updateTenantOrderStatusHandler({
        data: { orderId, status: "CANCELED" },
        context: tenantContext,
      }),
    ).resolves.toMatchObject({ status: "CANCELED" });

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { orderId },
      data: { status: "CANCELED", rawPayload: { reason: "tenant_manual_cancel" } },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { status: "CANCELED", canceledAt: expect.any(Date) },
    });
  });

  it("rejects tenant order actions without tenant context", async () => {
    await expect(getTenantOrdersHandler({ context: noTenantContext })).rejects.toThrow(
      "Toko tidak ditemukan untuk pengguna ini",
    );
    await expect(getTenantOrderCountHandler({ context: noTenantContext })).rejects.toThrow(
      "Toko tidak ditemukan untuk pengguna ini",
    );
  });
});
