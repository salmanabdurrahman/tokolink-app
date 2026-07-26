import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { sendOrderReceiptEmail, sendTenantOrderNotificationEmail } from "./email";
import { WITHDRAWAL_HOLD_DAYS } from "../lib/commerce-policy";

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

type PaidOrderItem = {
  productId: string | null;
  qty: number;
  product?: { trackStock: boolean; stock: number | null } | null;
};

// Decrement stock only for products opted into tracking; only ever called once
// per order, inside the same tx as the PENDING_PAYMENT -> PAID transition, so
// concurrent webhook retries never double-decrement (guarded by the caller's
// updateMany count check). Clamps at 0 defensively against cross-order races
// the checkout-time stock guard cannot fully prevent.
async function decrementTrackedProductStock(tx: Prisma.TransactionClient, items: PaidOrderItem[]) {
  const trackedProductIds: string[] = [];
  for (const item of items) {
    if (!item.productId || !item.product?.trackStock || item.product.stock === null) continue;
    trackedProductIds.push(item.productId);
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.qty } },
    });
  }
  if (trackedProductIds.length === 0) return;
  await tx.product.updateMany({
    where: { id: { in: trackedProductIds }, stock: { lt: 0 } },
    data: { stock: 0 },
  });
}

export async function markOrderPaid(orderNumber: string, rawPayload: unknown, method = "") {
  const availableAt = new Date(Date.now() + WITHDRAWAL_HOLD_DAYS * 24 * 60 * 60 * 1000);

  const paidOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderNumber }, include: { payment: true } });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status === "PAID") return order;
    if (order.status !== "PENDING_PAYMENT") return order;

    const updatedOrder = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (updatedOrder.count !== 1) return order;

    await tx.payment.update({
      where: { orderId: order.id, status: "PENDING" },
      data: {
        status: "PAID",
        method,
        paidAt: new Date(),
        rawPayload: toPrismaJson(rawPayload),
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
    const fullOrder = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: { include: { product: true } }, tenant: { include: { user: true } } },
    });

    await decrementTrackedProductStock(tx, fullOrder.items);

    return fullOrder;
  });

  // Fire-and-forget: webhook response must not block on Resend, otherwise
  // Pakasir retries the webhook and doubles the ledger/notification work.
  if ("customerEmail" in paidOrder && paidOrder.customerEmail) {
    sendOrderReceiptEmail(paidOrder.customerEmail, paidOrder.orderNumber, paidOrder.total).catch(
      (error) => console.error("[ORDER] Failed to send receipt email", error),
    );
  }
  if ("tenant" in paidOrder && paidOrder.tenant?.user?.email) {
    sendTenantOrderNotificationEmail(
      paidOrder.tenant.user.email,
      paidOrder.orderNumber,
      paidOrder.total,
    ).catch((error) => console.error("[ORDER] Failed to send tenant notification", error));
  }

  return paidOrder;
}

// No stock restore here: tracked stock is only ever decremented on the
// PENDING_PAYMENT -> PAID transition in markOrderPaid, and this function only
// cancels orders still in PENDING_PAYMENT (guarded below), so nothing was
// decremented yet for the order being canceled.
export async function markOrderCanceled(orderNumber: string, rawPayload: unknown) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderNumber }, include: { payment: true } });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status !== "PENDING_PAYMENT") return order;
    await tx.payment.update({
      where: { orderId: order.id },
      data: { status: "CANCELED", rawPayload: toPrismaJson(rawPayload) },
    });
    return tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
  });
}
