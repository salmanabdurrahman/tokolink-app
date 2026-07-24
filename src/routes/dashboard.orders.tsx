import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackageCheck } from "lucide-react";
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

function OrdersPage() {
  const { orders } = Route.useLoaderData();
  const [trackingForms, setTrackingForms] = useState(
    Object.fromEntries(
      orders.map((order) => [
        order.id,
        { courier: order.courier || "jne", trackingNumber: order.trackingNumber || "" },
      ]),
    ),
  );
  const [savingId, setSavingId] = useState("");

  return (
    <div className="space-y-8 bg-background text-foreground">
      <PageHeader label="Order" title="Fulfillment toko" />

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Belum ada order masuk.
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const form = trackingForms[order.id] || { courier: order.courier, trackingNumber: "" };
            const canUpdateTracking = order.status === "PAID" || order.status === "SHIPPED";

            return (
              <article key={order.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-medium">{order.orderNumber}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.customerName} · {formatIDR(order.total)}
                    </p>
                  </div>
                  <Badge>{statusLabel(order.status)}</Badge>
                </div>

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
                      toast.success("Resi pengiriman disimpan");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Gagal menyimpan resi");
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
      )}
    </div>
  );
}
