import { z } from "zod";
import { prisma } from "../db";
import { getPakasirTransactionDetail, isCompletedPakasirStatus } from "./pakasir";
import { markOrderCanceled, markOrderPaid } from "./order-helpers.server";

const pakasirWebhookSchema = z
  .object({
    order_id: z.string().min(1),
    amount: z.number().int().positive(),
  })
  .passthrough();

export async function handlePakasirWebhook(payload: unknown) {
  const parsed = pakasirWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "Payload tidak valid" };
  }
  const webhookPayload = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNumber: webhookPayload.order_id },
    include: { payment: true },
  });
  if (!order || !order.payment || order.total !== webhookPayload.amount) {
    return { ok: false, status: 400, error: "Order atau nominal tidak valid" };
  }

  const detail = await getPakasirTransactionDetail(order.orderNumber, order.total);
  const transaction = detail.transaction;
  if (transaction.order_id !== order.orderNumber || transaction.amount !== order.total) {
    return { ok: false, status: 400, error: "Detail transaksi tidak cocok" };
  }

  if (isCompletedPakasirStatus(transaction.status)) {
    await markOrderPaid(
      order.orderNumber,
      { webhook: webhookPayload, detail: transaction },
      transaction.payment_method || "",
    );
    return { ok: true, status: 200 };
  }

  if (["expired", "canceled", "cancelled"].includes(transaction.status.toLowerCase())) {
    await markOrderCanceled(order.orderNumber, { webhook: webhookPayload, detail: transaction });
    return { ok: true, status: 200 };
  }

  return { ok: true, status: 200, ignored: true };
}
