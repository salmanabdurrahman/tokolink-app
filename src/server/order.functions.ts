import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../db";
import { checkoutSchema } from "../lib/schemas";
import { createCheckoutOrderData } from "./checkout.server";
import { authMiddleware } from "./auth-middleware";

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .validator(checkoutSchema)
  .handler(async ({ data }) => createCheckoutOrderData(data));

function maskPublicTrackingNumber(value: string) {
  if (value.length <= 6) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}

export const updateOrderTrackingSchema = z.object({
  orderId: z.string().uuid(),
  courier: z.string().min(2, "Kurir harus diisi").max(40),
  trackingNumber: z.string().min(4, "Nomor resi harus diisi").max(80),
});

export const updateTenantOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["COMPLETED", "CANCELED"]),
});

export const getOrderStatus = createServerFn({ method: "GET" })
  .validator(z.string().min(1))
  .handler(async ({ data: orderNumber }) => {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        customerName: true,
        subtotal: true,
        shippingCost: true,
        total: true,
        status: true,
        courier: true,
        shippingService: true,
        trackingNumber: true,
        tenant: { select: { name: true, whatsapp: true } },
        payment: { select: { status: true, rawPayload: true } },
        items: true,
      },
    });
    if (!order) throw new Error("Order tidak ditemukan");
    const paymentPayload = order.payment?.rawPayload as { payment_url?: string } | null;
    return {
      ...order,
      trackingNumber: order.trackingNumber ? maskPublicTrackingNumber(order.trackingNumber) : "",
      payment: order.payment
        ? { status: order.payment.status, paymentUrl: paymentPayload?.payment_url || "" }
        : null,
    };
  });

export const getTenantOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    return prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { items: true, payment: true },
      take: 50,
    });
  });

export const getTenantOrderCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    return prisma.order.count({ where: { tenantId, status: "PAID" } });
  });

export const getTenantOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.string().uuid())
  .handler(async ({ data: orderId, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, payment: true, ledgerEntries: true },
    });
    if (!order) throw new Error("Order tidak ditemukan");
    return order;
  });

export const updateOrderTracking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateOrderTrackingSchema)
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    const order = await prisma.order.findFirst({ where: { id: data.orderId, tenantId } });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status !== "PAID" && order.status !== "SHIPPED") {
      throw new Error("Resi hanya bisa diisi setelah order dibayar");
    }

    return prisma.order.update({
      where: { id: order.id },
      data: {
        courier: data.courier,
        trackingNumber: data.trackingNumber,
        status: "SHIPPED",
        shippedAt: order.shippedAt || new Date(),
      },
    });
  });

export const updateTenantOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateTenantOrderStatusSchema)
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    const order = await prisma.order.findFirst({ where: { id: data.orderId, tenantId } });
    if (!order) throw new Error("Order tidak ditemukan");

    if (data.status === "COMPLETED") {
      if (order.status !== "SHIPPED")
        throw new Error("Order hanya bisa diselesaikan setelah dikirim");
      return prisma.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    if (order.status !== "PENDING_PAYMENT") {
      throw new Error("Hanya order belum dibayar yang bisa dibatalkan");
    }

    return prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: { status: "CANCELED", rawPayload: { reason: "tenant_manual_cancel" } },
      });
      return tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELED", canceledAt: new Date() },
      });
    });
  });
