import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { analyticsFunnelLabels } from "@/lib/status-labels";
import { isExpectedLoaderError, logLoaderError } from "@/lib/loader-error";

const RANGE_OPTIONS = [7, 30, 90] as const;
const FUNNEL_ORDER = Object.keys(analyticsFunnelLabels) as Array<
  keyof typeof analyticsFunnelLabels
>;

type FunnelEvent = (typeof FUNNEL_ORDER)[number];
type FunnelTotals = Record<FunnelEvent, number>;

function emptyTotals(): FunnelTotals {
  return Object.fromEntries(FUNNEL_ORDER.map((event) => [event, 0])) as FunnelTotals;
}

export const Route = createFileRoute("/dashboard/analytics")({
  loader: async () => {
    try {
      const { getAnalyticsFunnel } = await import("@/server/analytics.functions");
      const result = await getAnalyticsFunnel({ data: { days: 30 } });
      return { days: result.days, totals: result.totals as FunnelTotals, loaderError: false };
    } catch (error) {
      logLoaderError("dashboard.analytics", error);
      return { days: 30, totals: emptyTotals(), loaderError: !isExpectedLoaderError(error) };
    }
  },
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const initial = Route.useLoaderData();
  const [days, setDays] = useState(initial.days);
  const [totals, setTotals] = useState<FunnelTotals>(initial.totals);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (days === initial.days) return;
    let cancelled = false;
    setLoading(true);
    import("@/server/analytics.functions")
      .then(({ getAnalyticsFunnel }) => getAnalyticsFunnel({ data: { days } }))
      .then((result) => {
        if (!cancelled) setTotals(result.totals as FunnelTotals);
      })
      .catch(() => {
        if (!cancelled) setTotals(emptyTotals());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, initial.days]);

  const hasData = FUNNEL_ORDER.some((event) => totals[event] > 0);
  const baseline = totals.storefront_view || 0;

  return (
    <div className="space-y-8 bg-background text-foreground animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader label="Analitik" title="Funnel toko" />
        <Select
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          className="sm:w-44"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} hari terakhir
            </option>
          ))}
        </Select>
      </div>

      {initial.loaderError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data analitik. Periksa koneksi Anda dan coba muat ulang halaman.
        </div>
      )}

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Belum ada data pengunjung dalam rentang ini.
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5 ${
            loading ? "opacity-60" : ""
          }`}
        >
          {FUNNEL_ORDER.map((event) => {
            const value = totals[event] ?? 0;
            const conversion = baseline > 0 ? Math.round((value / baseline) * 100) : 0;
            return (
              <div key={event} className="bg-card p-6">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {analyticsFunnelLabels[event]}
                </div>
                <div className="font-display mt-3 text-3xl font-light tracking-tight">{value}</div>
                {event !== "storefront_view" && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {conversion}% dari kunjungan
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
