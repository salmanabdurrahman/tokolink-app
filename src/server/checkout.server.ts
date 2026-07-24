import { prisma } from "../db";
import { checkoutSchema } from "../lib/schemas";
import { getPublicUrlServer } from "../lib/config.server";
import { getCheckoutCatalogBySlug } from "./catalog.queries.server";
import {
  PLATFORM_FEE_RATE,
  buildCheckoutOrderItems,
  createCheckoutOrderRecord,
  validateCheckoutShippingQuote,
  validateCheckoutTenant,
} from "./checkout.service.server";
import { buildPakasirPayUrl, createPakasirTransaction } from "./pakasir";
import { markOrderCanceled } from "./order-helpers.server";
import type { z } from "zod";

type CheckoutInput = z.infer<typeof checkoutSchema>;

function makeOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `TL${date}${random}`;
}

export async function createCheckoutOrderData(data: CheckoutInput) {
  const tenant = await getCheckoutCatalogBySlug(
    data.tenantSlug,
    data.items.map((item) => item.productId),
  );
  validateCheckoutTenant(tenant, data);

  const orderItems = buildCheckoutOrderItems(tenant, data);
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const calculatedWeight = orderItems.reduce((sum, item) => sum + item.totalWeightGram, 0);
  const matchedShipping = await validateCheckoutShippingQuote(tenant, data, calculatedWeight);

  const shippingCost = matchedShipping.cost;
  const platformFee = Math.ceil(subtotal * PLATFORM_FEE_RATE);
  const total = subtotal + shippingCost;
  const orderNumber = makeOrderNumber();
  const redirectUrl = getPublicUrlServer(`/orders/${orderNumber}`);
  const paymentUrl = buildPakasirPayUrl(orderNumber, total, redirectUrl);

  const order = await createCheckoutOrderRecord({
    tenant,
    data,
    orderItems,
    subtotal,
    shippingCost,
    platformFee,
    total,
    orderNumber,
    paymentUrl,
    shippingService: matchedShipping.service,
    shippingEtd: matchedShipping.etd || data.shipping.etd || "",
    calculatedWeight,
  });

  try {
    const pakasir = await createPakasirTransaction(orderNumber, total, "qris");
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        method: pakasir.payment.payment_method || "qris",
        rawPayload: { ...pakasir.payment, payment_url: paymentUrl },
      },
    });
  } catch (error) {
    await markOrderCanceled(order.orderNumber, { reason: "pakasir_create_failed" }).catch(
      () => undefined,
    );
    throw error;
  }

  return { orderNumber: order.orderNumber, paymentUrl, total: order.total };
}
