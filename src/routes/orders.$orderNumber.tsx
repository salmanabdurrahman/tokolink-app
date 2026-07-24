import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, PackageCheck } from "lucide-react";
import { buildWhatsAppUrl } from "../lib/store";
import { formatIDR } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/orders/$orderNumber")({
  loader: async ({ params }) => {
    const { getOrderStatus } = await import("../server/order.functions");
    const order = await getOrderStatus({ data: params.orderNumber });
    return { order };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.order
          ? `Order ${loaderData.order.orderNumber} — Tokolink`
          : "Order — Tokolink",
      },
      { name: "description", content: "Cek status pembayaran dan detail order Tokolink." },
    ],
  }),
  component: OrderStatusPage,
});

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "Menunggu pembayaran",
    PAID: "Sudah dibayar",
    SHIPPED: "Dikirim",
    COMPLETED: "Selesai",
    CANCELED: "Dibatalkan",
  };
  return labels[status] || status;
}

function OrderStatusPage() {
  const { order } = Route.useLoaderData();
  const paymentUrl = order.payment?.paymentUrl || "";
  const whatsappUrl = buildWhatsAppUrl(
    order.tenant.whatsapp,
    order.tenant.name,
    order.items.map((item) => ({
      key: item.id,
      productId: item.productId || "",
      productName: item.productName,
      variantName: item.variantName,
      unitPrice: item.unitPrice,
      qty: item.qty,
      image: item.productImage,
    })),
    order.subtotal,
    `Nomor order: ${order.orderNumber}`,
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Order Tokolink
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{order.tenant.name}</p>
          </div>
          <Badge>{statusLabel(order.status)}</Badge>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pembayaran</span>
            <span className="font-medium">{order.payment?.status || "PENDING"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kurir</span>
            <span className="font-medium">
              {order.courier} {order.shippingService}
            </span>
          </div>
          {order.trackingNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nomor resi</span>
              <span className="font-medium">{order.trackingNumber}</span>
            </div>
          )}
        </div>

        <ul className="mt-6 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <div className="font-medium">
                  {item.qty}x {item.productName}
                </div>
                {item.variantName && (
                  <div className="text-xs text-muted-foreground">{item.variantName}</div>
                )}
              </div>
              <div className="font-medium">{formatIDR(item.totalPrice)}</div>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatIDR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir</span>
            <span>{formatIDR(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between font-display text-xl">
            <span>Total</span>
            <span>{formatIDR(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {order.payment?.status === "PENDING" && paymentUrl && (
            <Button
              variant="accent"
              className="w-full"
              onClick={() => window.location.assign(paymentUrl)}
            >
              <PackageCheck className="h-4 w-4" /> Bayar sekarang
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.assign(whatsappUrl)}
          >
            <MessageCircle className="h-4 w-4" /> Chat tenant
          </Button>
          <p className="text-center text-xs text-muted-foreground sm:col-span-2">
            Email receipt dikirim setelah pembayaran terkonfirmasi.
          </p>
        </div>
      </div>
    </main>
  );
}
