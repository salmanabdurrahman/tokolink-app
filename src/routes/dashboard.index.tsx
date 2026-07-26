import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { SalesInsightCard } from "@/components/dashboard/sales-insight-card";
import { getPublicHostname, getPublicUrl } from "@/lib/site-url";
import { formatCurrency } from "@/lib/formatters";
import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/commerce-policy";
import { buildDashboardCtas } from "@/lib/dashboard-overview";
import { Route as DashboardRoute } from "./dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const {
    tenant,
    productCount,
    linkCount,
    orderCount,
    pendingPaymentCount,
    completedOrderCount,
    salesTotal,
    salesDeltaPercent,
    availableBalance,
  } = DashboardRoute.useLoaderData();

  if (!tenant) return null;

  const publicHostname = getPublicHostname();
  const storeUrl = getPublicUrl(`/${tenant.slug}`);
  const isNewTenant = productCount === 0;

  async function shareStore() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Link toko disalin");
    } catch {
      toast.error("Gagal menyalin link toko");
    }
  }

  const ctas = buildDashboardCtas({
    isNewTenant,
    whatsapp: tenant.whatsapp,
    pendingPaymentCount,
    orderCount,
    availableBalance,
    minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
    formatCurrency,
  });

  return (
    <div className="space-y-12 bg-background text-foreground animate-fade-in">
      <div className="space-y-4">
        <PageHeader label="Overview" title={`Halo, ${tenant.name}.`} />
        <p className="text-sm text-muted-foreground">
          URL toko Anda:{" "}
          <a href={storeUrl} className="text-foreground font-semibold hover:underline">
            {publicHostname}/{tenant.slug} ↗
          </a>
        </p>
      </div>

      {isNewTenant ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
          Toko Anda masih kosong. Tambahkan produk pertama dan lengkapi profil toko untuk mulai
          menerima pesanan.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Produk aktif", value: productCount },
              { label: "Tautan", value: linkCount },
              { label: "Status WA", value: tenant.whatsapp ? "Terhubung" : "Belum" },
              { label: "Pending bayar", value: pendingPaymentCount },
              { label: "Perlu dikirim", value: orderCount },
              { label: "Selesai", value: completedOrderCount },
            ].map((s) => (
              <div key={s.label} className="bg-card p-6">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="font-display mt-3 text-3xl font-light tracking-tight">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            <div className="bg-card p-8">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Penjualan 30 hari
              </div>
              <div className="font-display mt-3 text-4xl font-light tracking-tight">
                {formatCurrency(salesTotal)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {salesDeltaPercent === null
                  ? "Belum ada data periode sebelumnya"
                  : `${salesDeltaPercent >= 0 ? "▲" : "▼"} ${Math.abs(salesDeltaPercent)}% dari 30 hari sebelumnya`}
              </div>
            </div>
            <div className="bg-card p-8">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Saldo tersedia
              </div>
              <div className="font-display mt-3 text-4xl font-light tracking-tight">
                {formatCurrency(availableBalance)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {availableBalance >= MIN_WITHDRAWAL_AMOUNT
                  ? "Siap dicairkan"
                  : `Minimum pencairan ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}`}
              </div>
            </div>
          </div>
        </>
      )}

      <SalesInsightCard />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ctas.map((cta) => {
          const content = (
            <>
              <div className="flex items-center justify-between">
                <span className="font-display text-sm text-muted-foreground">{cta.index}</span>
                <span className="text-muted-foreground group-hover:text-foreground">→</span>
              </div>
              <h3 className="font-display mt-12 text-2xl font-medium">{cta.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{cta.description}</p>
            </>
          );

          if (cta.to) {
            return (
              <Link
                key={cta.key}
                to={cta.to}
                className="group rounded-2xl border border-border bg-card p-8 transition hover:border-foreground/30"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={cta.key}
              type="button"
              onClick={shareStore}
              className="group rounded-2xl border border-border bg-card p-8 text-left transition hover:border-foreground/30"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
