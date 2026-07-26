import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import { formatOrderDate, getWithdrawalEligibleDate, paymentLabel } from "@/lib/order-view";
import type { TenantOrder } from "@/lib/types";
import { OrderStatusActions } from "@/components/dashboard/order-status-actions";

interface OrderDetailProps {
  order: TenantOrder;
  savingId: string;
  onUpdateStatus: (orderId: string, status: "COMPLETED" | "CANCELED") => void;
}

export function OrderDetail({ order, savingId, onUpdateStatus }: OrderDetailProps) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Detail order</p>
          <h2 className="mt-1 font-display text-2xl font-medium">{order.orderNumber}</h2>
        </div>
        <Badge>{paymentLabel(order.payment?.status)}</Badge>
      </div>

      <div className="mt-5 grid gap-4 text-sm">
        <section className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold">Customer</h3>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <p>{order.customerName}</p>
            <p>{order.customerWhatsapp}</p>
            <p>{order.customerEmail || "Email tidak diisi"}</p>
            <p>{order.customerAddress}</p>
          </div>
          <a
            href={`https://wa.me/${order.customerWhatsapp.replace(/\D/g, "")}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-accent underline-offset-4"
          >
            <MessageCircle className="h-4 w-4" /> Hubungi WhatsApp
          </a>
        </section>

        <section className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold">Item</h3>
          <div className="mt-2 divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 py-2 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{item.productName}</p>
                  {item.variantName && <p>{item.variantName}</p>}
                  <p>
                    {item.qty} × {formatIDR(item.unitPrice)}
                  </p>
                </div>
                <p className="font-medium text-foreground">{formatIDR(item.totalPrice)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold">Pembayaran & ledger</h3>
          <div className="mt-2 grid gap-1 text-muted-foreground">
            <p>Subtotal: {formatIDR(order.subtotal)}</p>
            <p>Ongkir: {formatIDR(order.shippingCost)}</p>
            <p>Fee platform: {formatIDR(order.platformFee)}</p>
            <p>Total: {formatIDR(order.total)}</p>
            <p>Dibayar: {formatOrderDate(order.paidAt)}</p>
            <p>Saldo eligible: {getWithdrawalEligibleDate(order.paidAt)}</p>
          </div>
        </section>

        <section className="rounded-xl bg-surface p-4">
          <h3 className="font-semibold">Pengiriman</h3>
          <div className="mt-2 grid gap-1 text-muted-foreground">
            <p>
              {order.courier} {order.shippingService} · {order.shippingEtd || "ETD belum tersedia"}
            </p>
            <p>Berat: {order.shippingWeightGram} gram</p>
            <p>Resi: {order.trackingNumber || "Belum ada"}</p>
            <p>Dikirim: {formatOrderDate(order.shippedAt)}</p>
          </div>
        </section>
      </div>

      <OrderStatusActions order={order} savingId={savingId} onUpdateStatus={onUpdateStatus} />
    </aside>
  );
}
