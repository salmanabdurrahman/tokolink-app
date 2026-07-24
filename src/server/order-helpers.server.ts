import { prisma } from "../db";
import { sendOrderReceiptEmail, sendTenantOrderNotificationEmail } from "./email";

const WITHDRAWAL_HOLD_DAYS = 2;

export async function markOrderPaid(orderNumber: string, rawPayload: unknown, method = "") {
  const availableAt = new Date(Date.now() + WITHDRAWAL_HOLD_DAYS * 24 * 60 * 60 * 1000);

  const paidOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderNumber }, include: { payment: true } });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status === "PAID") return order;

    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "PAID",
        method,
        paidAt: new Date(),
        rawPayload: rawPayload as any,
      },
    });
    await tx.ledgerEntry.createMany({
      data: [
        {
          tenantId: order.tenantId,
          orderId: order.id,
          type: "CREDIT",
          amount: order.subtotal,
          availableAt,
          status: "PENDING",
          note: `Order ${order.orderNumber}`,
        },
        {
          tenantId: order.tenantId,
          orderId: order.id,
          type: "FEE",
          amount: -order.platformFee,
          availableAt,
          status: "PENDING",
          note: `Fee platform order ${order.orderNumber}`,
        },
      ],
      skipDuplicates: true,
    });
    return tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
      include: { items: true, tenant: { include: { user: true } } },
    });
  });

  if ("customerEmail" in paidOrder && paidOrder.customerEmail) {
    await sendOrderReceiptEmail(
      paidOrder.customerEmail,
      paidOrder.orderNumber,
      paidOrder.total,
    ).catch((error) => console.error("[ORDER] Failed to send receipt email", error));
  }
  if ("tenant" in paidOrder && paidOrder.tenant?.user?.email) {
    await sendTenantOrderNotificationEmail(
      paidOrder.tenant.user.email,
      paidOrder.orderNumber,
      paidOrder.total,
    ).catch((error) => console.error("[ORDER] Failed to send tenant notification", error));
  }

  return paidOrder;
}

export async function markOrderCanceled(orderNumber: string, rawPayload: unknown) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderNumber }, include: { payment: true } });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status !== "PENDING_PAYMENT") return order;
    await tx.payment.update({
      where: { orderId: order.id },
      data: { status: "CANCELED", rawPayload: rawPayload as any },
    });
    return tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
  });
}
