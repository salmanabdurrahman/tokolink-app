import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenantOrder } from "@/lib/types";

interface OrderStatusActionsProps {
  order: TenantOrder;
  savingId: string;
  onUpdateStatus: (orderId: string, status: "COMPLETED" | "CANCELED") => void;
}

export function OrderStatusActions({ order, savingId, onUpdateStatus }: OrderStatusActionsProps) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={order.status !== "SHIPPED" || savingId === order.id}
        onClick={() => onUpdateStatus(order.id, "COMPLETED")}
      >
        <CheckCircle2 className="h-4 w-4" /> Tandai selesai
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={order.status !== "PENDING_PAYMENT" || savingId === order.id}
        onClick={() => onUpdateStatus(order.id, "CANCELED")}
      >
        <XCircle className="h-4 w-4" /> Batalkan pesanan
      </Button>
    </div>
  );
}
