import { prisma } from "../db";
import { getPakasirTransactionDetail, isCompletedPakasirStatus } from "./pakasir";
import { markOrderCanceled, markOrderPaid } from "./order.functions";

export async function handlePakasirWebhook(payload: any) {
  if (!payload || typeof payload.order_id !== "string" || typeof payload.amount !== "number") {
    return { ok: false, status: 400, error: "Payload tidak valid" };
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: payload.order_id },
    include: { payment: true },
  });
  if (!order || !order.payment || order.total !== payload.amount) {
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
      { webhook: payload, detail: transaction },
      transaction.payment_method || "",
    );
    return { ok: true, status: 200 };
  }

  if (["expired", "canceled", "cancelled"].includes(transaction.status.toLowerCase())) {
    await markOrderCanceled(order.orderNumber, { webhook: payload, detail: transaction });
    return { ok: true, status: 200 };
  }

  return { ok: true, status: 200, ignored: true };
}
