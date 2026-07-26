import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import { statusLabel } from "@/lib/order-view";
import type { TenantOrder } from "@/lib/types";
import {
  OrderTrackingForm,
  type OrderTrackingFormValue,
} from "@/components/dashboard/order-tracking-form";

interface OrderCardProps {
  order: TenantOrder;
  onSelect: (orderId: string) => void;
  trackingForm: OrderTrackingFormValue;
  savingId: string;
  onTrackingChange: (orderId: string, value: OrderTrackingFormValue) => void;
  onTrackingSubmit: (order: TenantOrder, form: OrderTrackingFormValue) => void;
}

export function OrderCard({
  order,
  onSelect,
  trackingForm,
  savingId,
  onTrackingChange,
  onTrackingSubmit,
}: OrderCardProps) {
  const canUpdateTracking = order.status === "PAID" || order.status === "SHIPPED";

  return (
    <article className="rounded-2xl border border-border bg-card p-6">
      <button
        type="button"
        onClick={() => onSelect(order.id)}
        className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
      >
        <div>
          <h2 className="font-display text-xl font-medium">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName} · {formatIDR(order.total)}
          </p>
        </div>
        <Badge>{statusLabel(order.status)}</Badge>
      </button>

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
        <div>{order.items.length} item</div>
        <div>
          Pengiriman: {order.courier} {order.shippingService} · {formatIDR(order.shippingCost)}
        </div>
        {order.trackingNumber && <div>Resi: {order.trackingNumber}</div>}
      </div>

      <OrderTrackingForm
        value={trackingForm}
        canUpdateTracking={canUpdateTracking}
        saving={savingId === order.id}
        onChange={(value) => onTrackingChange(order.id, value)}
        onSubmit={(event) => {
          event.preventDefault();
          onTrackingSubmit(order, trackingForm);
        }}
      />
    </article>
  );
}
