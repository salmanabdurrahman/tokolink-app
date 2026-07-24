import { prisma } from "../db";
import { calculateDomesticCost, type RajaOngkirCostOption } from "./rajaongkir";
import type { getCheckoutCatalogBySlug } from "./catalog.queries.server";
import type { z } from "zod";
import type { checkoutSchema } from "../lib/schemas";
import { PLATFORM_FEE_RATE } from "../lib/commerce-policy";

export { PLATFORM_FEE_RATE };

type CheckoutInput = z.infer<typeof checkoutSchema>;
type CheckoutTenant = NonNullable<Awaited<ReturnType<typeof getCheckoutCatalogBySlug>>>;

function normalizeShippingValue(value: string) {
  return value.trim().toLowerCase();
}

export function validateCheckoutTenant(
  tenant: CheckoutTenant | null,
  data: CheckoutInput,
): asserts tenant is CheckoutTenant {
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
}

export function buildCheckoutOrderItems(tenant: CheckoutTenant, data: CheckoutInput) {
  const products = new Map(tenant.products.map((product) => [product.id, product]));

  return data.items.map((item) => {
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
}

export async function validateCheckoutShippingQuote(
  tenant: CheckoutTenant,
  data: CheckoutInput,
  calculatedWeight: number,
) {
  if (calculatedWeight < 1) throw new Error("Berat pengiriman tidak valid");

  const shippingOptions = await calculateDomesticCost({
    origin: tenant.rajaOngkirOriginId || "",
    destination: data.customer.rajaOngkirDestinationId || "",
    weight: calculatedWeight,
    couriers: [data.shipping.courier],
  });
  const matchedShipping = shippingOptions.find(
    (option: RajaOngkirCostOption) =>
      normalizeShippingValue(option.courier) === normalizeShippingValue(data.shipping.courier) &&
      normalizeShippingValue(option.service) === normalizeShippingValue(data.shipping.service) &&
      option.cost === data.shipping.cost,
  );
  if (!matchedShipping) {
    throw new Error("Pilihan ongkir tidak valid. Silakan hitung ulang ongkir.");
  }

  return matchedShipping;
}

export async function createCheckoutOrderRecord({
  tenant,
  data,
  orderItems,
  subtotal,
  shippingCost,
  platformFee,
  total,
  orderNumber,
  paymentUrl,
  shippingService,
  shippingEtd,
  calculatedWeight,
}: {
  tenant: CheckoutTenant;
  data: CheckoutInput;
  orderItems: ReturnType<typeof buildCheckoutOrderItems>;
  subtotal: number;
  shippingCost: number;
  platformFee: number;
  total: number;
  orderNumber: string;
  paymentUrl: string;
  shippingService: string;
  shippingEtd: string;
  calculatedWeight: number;
}) {
  return prisma.$transaction(async (tx) => {
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
        shippingService,
        shippingEtd,
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
}
