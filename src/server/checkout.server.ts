import { prisma } from "../db";
import { checkoutSchema } from "../lib/schemas";
import { buildPakasirPayUrl, createPakasirTransaction } from "./pakasir";
import { markOrderCanceled } from "./order-helpers.server";
import type { z } from "zod";

const PLATFORM_FEE_RATE = 0.015;

type CheckoutInput = z.infer<typeof checkoutSchema>;

function makeOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `TL${date}${random}`;
}

function getSiteUrl() {
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export async function createCheckoutOrderData(data: CheckoutInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: data.tenantSlug },
    include: {
      products: {
        where: { id: { in: data.items.map((item) => item.productId) } },
        include: { variantGroups: { include: { options: true } } },
      },
    },
  });

  if (!tenant) throw new Error("Toko tidak ditemukan");
  if (!tenant.rajaOngkirOriginId) {
    throw new Error("Toko belum mengatur origin pengiriman. Hubungi penjual.");
  }
  if (!data.customer.rajaOngkirDestinationId) {
    throw new Error("Tujuan pengiriman harus dipilih");
  }
  if (!tenant.allowedCouriers.includes(data.shipping.courier)) {
    throw new Error("Kurir tidak tersedia untuk toko ini");
  }
  if (tenant.products.length !== new Set(data.items.map((item) => item.productId)).size) {
    throw new Error("Sebagian produk tidak ditemukan");
  }

  const products = new Map(tenant.products.map((product) => [product.id, product]));
  const orderItems = data.items.map((item) => {
    const product = products.get(item.productId);
    if (!product) throw new Error("Produk tidak ditemukan");

    const selectedOptions = item.variantOptionIds.map((optionId) => {
      const option = product.variantGroups
        .flatMap((group) => group.options.map((option) => ({ ...option, groupName: group.name })))
        .find((option) => option.id === optionId);
      if (!option) throw new Error(`Varian ${product.name} tidak valid`);
      return option;
    });

    const variantName = selectedOptions
      .map((option) => `${option.groupName}: ${option.name}`)
      .join(", ");
    const unitPrice =
      product.basePrice + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
    const totalPrice = unitPrice * item.qty;
    const weightGram = product.weightGram || 1;

    return {
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      variantName,
      variantSnapshot: selectedOptions.map((option) => ({
        id: option.id,
        groupName: option.groupName,
        name: option.name,
        priceDelta: option.priceDelta,
      })),
      qty: item.qty,
      unitPrice,
      totalPrice,
      weightGram,
      totalWeightGram: weightGram * item.qty,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const calculatedWeight = orderItems.reduce((sum, item) => sum + item.totalWeightGram, 0);
  if (calculatedWeight < 1) throw new Error("Berat pengiriman tidak valid");

  const shippingCost = data.shipping.cost;
  const platformFee = Math.ceil(subtotal * PLATFORM_FEE_RATE);
  const total = subtotal + shippingCost;
  const orderNumber = makeOrderNumber();
  const redirectUrl = `${getSiteUrl()}/orders/${orderNumber}`;
  const paymentUrl = buildPakasirPayUrl(orderNumber, total, redirectUrl);

  const order = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        tenantId: tenant.id,
        name: data.customer.name,
        email: data.customer.email || "",
        whatsapp: data.customer.whatsapp,
        address: data.customer.address,
        province: data.customer.province || "",
        city: data.customer.city || "",
        district: data.customer.district || "",
        postalCode: data.customer.postalCode || "",
        rajaOngkirDestinationId: data.customer.rajaOngkirDestinationId || "",
        rajaOngkirDestinationLabel: data.customer.rajaOngkirDestinationLabel || "",
      },
    });

    return tx.order.create({
      data: {
        orderNumber,
        tenantId: tenant.id,
        customerId: customer.id,
        customerName: data.customer.name,
        customerEmail: data.customer.email || "",
        customerWhatsapp: data.customer.whatsapp,
        customerAddress: data.customer.address,
        customerProvince: data.customer.province || "",
        customerCity: data.customer.city || "",
        customerDistrict: data.customer.district || "",
        customerPostalCode: data.customer.postalCode || "",
        rajaOngkirDestinationId: data.customer.rajaOngkirDestinationId || "",
        rajaOngkirDestinationLabel: data.customer.rajaOngkirDestinationLabel || "",
        subtotal,
        shippingCost,
        platformFee,
        total,
        status: "PENDING_PAYMENT",
        courier: data.shipping.courier,
        shippingService: data.shipping.service,
        shippingEtd: data.shipping.etd || "",
        shippingWeightGram: calculatedWeight,
        items: { create: orderItems },
        payment: {
          create: {
            pakasirOrderId: orderNumber,
            amount: total,
            status: "PENDING",
            method: "qris",
            rawPayload: { payment_url: paymentUrl },
          },
        },
      },
      include: { payment: true },
    });
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
