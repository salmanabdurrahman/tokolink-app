import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, PackageCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatIDR } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/orders")({
  loader: async () => {
    try {
      const { getTenantOrders } = await import("@/server/order.functions");
      const orders = await getTenantOrders({});
      return { orders };
    } catch {
      return { orders: [] };
    }
  },
  component: OrdersPage,
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

function paymentLabel(status = "") {
  const labels: Record<string, string> = {
    PENDING: "Menunggu",
    PAID: "Lunas",
    FAILED: "Gagal",
    EXPIRED: "Kedaluwarsa",
    CANCELED: "Dibatalkan",
  };
  return labels[status] || status || "-";
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function getWithdrawalDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  date.setDate(date.getDate() + 2);
  return formatDate(date);
}

function OrdersPage() {
  const { orders } = Route.useLoaderData();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [shippingFilter, setShippingFilter] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || "");
  const [trackingForms, setTrackingForms] = useState(
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

  return (
    <div className="space-y-8 bg-background text-foreground">
      <PageHeader label="Order" title="Fulfillment toko" />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <Field label="Status order">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
          >
            <option value="ALL">Semua status</option>
            <option value="PENDING_PAYMENT">Menunggu pembayaran</option>
            <option value="PAID">Sudah dibayar</option>
            <option value="SHIPPED">Dikirim</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELED">Dibatalkan</option>
          </select>
        </Field>
        <Field label="Pembayaran">
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
          >
            <option value="ALL">Semua pembayaran</option>
            <option value="PENDING">Menunggu</option>
            <option value="PAID">Lunas</option>
            <option value="FAILED">Gagal</option>
            <option value="EXPIRED">Kedaluwarsa</option>
            <option value="CANCELED">Dibatalkan</option>
          </select>
        </Field>
        <Field label="Pengiriman">
          <select
            value={shippingFilter}
            onChange={(event) => setShippingFilter(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
          >
            <option value="ALL">Semua pengiriman</option>
            <option value="WITH_TRACKING">Sudah ada resi</option>
            <option value="WITHOUT_TRACKING">Belum ada resi</option>
          </select>
        </Field>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Belum ada order sesuai filter.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid gap-4 self-start">
            {filteredOrders.map((order) => {
              const form = trackingForms[order.id] || {
                courier: order.courier,
                trackingNumber: "",
              };
              const canUpdateTracking = order.status === "PAID" || order.status === "SHIPPED";

              return (
                <article key={order.id} className="rounded-2xl border border-border bg-card p-6">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
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
                      Pengiriman: {order.courier} {order.shippingService} ·{" "}
                      {formatIDR(order.shippingCost)}
                    </div>
                    {order.trackingNumber && <div>Resi: {order.trackingNumber}</div>}
                  </div>

                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
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
                        toast.error(
                          error instanceof Error ? error.message : "Gagal menyimpan resi",
                        );
                      } finally {
                        setSavingId("");
                      }
                    }}
                    className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
                  >
                    <Field label="Kurir">
                      <Input
                        value={form.courier}
                        disabled={!canUpdateTracking}
                        onChange={(event) =>
                          setTrackingForms((value) => ({
                            ...value,
                            [order.id]: { ...form, courier: event.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Nomor resi">
                      <Input
                        value={form.trackingNumber}
                        disabled={!canUpdateTracking}
                        onChange={(event) =>
                          setTrackingForms((value) => ({
                            ...value,
                            [order.id]: { ...form, trackingNumber: event.target.value },
                          }))
                        }
                        placeholder="Masukkan resi setelah dikirim"
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={!canUpdateTracking || savingId === order.id}
                      className="self-end"
                    >
                      <PackageCheck className="h-4 w-4" />
                      {savingId === order.id ? "Simpan..." : "Simpan resi"}
                    </Button>
                  </form>
                </article>
              );
            })}
          </div>

          {selectedOrder && (
            <aside className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-6 lg:self-start">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Detail order
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-medium">
                    {selectedOrder.orderNumber}
                  </h2>
                </div>
                <Badge>{paymentLabel(selectedOrder.payment?.status)}</Badge>
              </div>

              <div className="mt-5 grid gap-4 text-sm">
                <section className="rounded-xl bg-surface p-4">
                  <h3 className="font-semibold">Customer</h3>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <p>{selectedOrder.customerName}</p>
                    <p>{selectedOrder.customerWhatsapp}</p>
                    <p>{selectedOrder.customerEmail || "Email tidak diisi"}</p>
                    <p>{selectedOrder.customerAddress}</p>
                  </div>
                  <a
                    href={`https://wa.me/${selectedOrder.customerWhatsapp.replace(/\D/g, "")}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-accent underline-offset-4"
                  >
                    <MessageCircle className="h-4 w-4" /> Hubungi WhatsApp
                  </a>
                </section>

                <section className="rounded-xl bg-surface p-4">
                  <h3 className="font-semibold">Item</h3>
                  <div className="mt-2 divide-y divide-border">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-3 py-2 text-muted-foreground"
                      >
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
                    <p>Subtotal: {formatIDR(selectedOrder.subtotal)}</p>
                    <p>Ongkir: {formatIDR(selectedOrder.shippingCost)}</p>
                    <p>Fee platform: {formatIDR(selectedOrder.platformFee)}</p>
                    <p>Total: {formatIDR(selectedOrder.total)}</p>
                    <p>Dibayar: {formatDate(selectedOrder.paidAt)}</p>
                    <p>Saldo eligible: {getWithdrawalDate(selectedOrder.paidAt)}</p>
                  </div>
                </section>

                <section className="rounded-xl bg-surface p-4">
                  <h3 className="font-semibold">Pengiriman</h3>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <p>
                      {selectedOrder.courier} {selectedOrder.shippingService} ·{" "}
                      {selectedOrder.shippingEtd || "ETD belum tersedia"}
                    </p>
                    <p>Berat: {selectedOrder.shippingWeightGram} gram</p>
                    <p>Resi: {selectedOrder.trackingNumber || "Belum ada"}</p>
                    <p>Dikirim: {formatDate(selectedOrder.shippedAt)}</p>
                  </div>
                </section>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={selectedOrder.status !== "SHIPPED" || savingId === selectedOrder.id}
                  onClick={() => updateStatus(selectedOrder.id, "COMPLETED")}
                >
                  <CheckCircle2 className="h-4 w-4" /> Tandai selesai
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    selectedOrder.status !== "PENDING_PAYMENT" || savingId === selectedOrder.id
                  }
                  onClick={() => updateStatus(selectedOrder.id, "CANCELED")}
                >
                  <XCircle className="h-4 w-4" /> Batalkan unpaid
                </Button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
