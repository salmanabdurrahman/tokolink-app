import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { isExpectedLoaderError, logLoaderError } from "@/lib/loader-error";
import { OrderFilterBar } from "@/components/dashboard/order-filter-bar";
import { OrderCard } from "@/components/dashboard/order-card";
import { OrderDetail } from "@/components/dashboard/order-detail";
import type { OrderTrackingFormValue } from "@/components/dashboard/order-tracking-form";
import type { TenantOrder } from "@/lib/types";

export const Route = createFileRoute("/dashboard/orders")({
  loader: async () => {
    try {
      const { getTenantOrders } = await import("@/server/order.functions");
      const orders = await getTenantOrders({});
      return { orders, loaderError: false };
    } catch (error) {
      logLoaderError("dashboard.orders", error);
      return { orders: [], loaderError: !isExpectedLoaderError(error) };
    }
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { orders, loaderError } = Route.useLoaderData();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [shippingFilter, setShippingFilter] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || "");
  const [trackingForms, setTrackingForms] = useState<Record<string, OrderTrackingFormValue>>(
    Object.fromEntries(
      orders.map((order) => [
        order.id,
        { courier: order.courier || "jne", trackingNumber: order.trackingNumber || "" },
      ]),
    ),
  );
  const [savingId, setSavingId] = useState("");

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const statusMatch = statusFilter === "ALL" || order.status === statusFilter;
        const paymentMatch = paymentFilter === "ALL" || order.payment?.status === paymentFilter;
        const shippingMatch =
          shippingFilter === "ALL" ||
          (shippingFilter === "WITH_TRACKING" && Boolean(order.trackingNumber)) ||
          (shippingFilter === "WITHOUT_TRACKING" && !order.trackingNumber);
        return statusMatch && paymentMatch && shippingMatch;
      }),
    [orders, paymentFilter, shippingFilter, statusFilter],
  );
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || filteredOrders[0];

  async function updateStatus(orderId: string, status: "COMPLETED" | "CANCELED") {
    try {
      setSavingId(orderId);
      const { updateTenantOrderStatus } = await import("@/server/order.functions");
      await updateTenantOrderStatus({ data: { orderId, status } });
      await router.invalidate();
      toast.success(status === "COMPLETED" ? "Order ditandai selesai" : "Order dibatalkan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status order");
    } finally {
      setSavingId("");
    }
  }

  async function submitTracking(order: TenantOrder, form: OrderTrackingFormValue) {
    try {
      setSavingId(order.id);
      const { updateOrderTracking } = await import("@/server/order.functions");
      await updateOrderTracking({
        data: {
          orderId: order.id,
          courier: form.courier,
          trackingNumber: form.trackingNumber,
        },
      });
      await router.invalidate();
      toast.success("Resi pengiriman disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan resi");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-8 bg-background text-foreground">
      <PageHeader label="Order" title="Fulfillment toko" />

      {loaderError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data order. Periksa koneksi Anda dan coba muat ulang halaman.
        </div>
      )}

      <OrderFilterBar
        statusFilter={statusFilter}
        paymentFilter={paymentFilter}
        shippingFilter={shippingFilter}
        onStatusChange={setStatusFilter}
        onPaymentChange={setPaymentFilter}
        onShippingChange={setShippingFilter}
      />

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Belum ada order sesuai filter.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid gap-4 self-start">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={setSelectedOrderId}
                trackingForm={
                  trackingForms[order.id] || { courier: order.courier, trackingNumber: "" }
                }
                savingId={savingId}
                onTrackingChange={(orderId, value) =>
                  setTrackingForms((current) => ({ ...current, [orderId]: value }))
                }
                onTrackingSubmit={submitTracking}
              />
            ))}
          </div>

          {selectedOrder && (
            <OrderDetail order={selectedOrder} savingId={savingId} onUpdateStatus={updateStatus} />
          )}
        </div>
      )}
    </div>
  );
}
