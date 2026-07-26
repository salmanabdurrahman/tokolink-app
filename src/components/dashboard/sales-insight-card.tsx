import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/formatters";

type SalesInsightMetrics = {
  days: number;
  currentSalesTotal: number;
  salesDeltaPercent: number | null;
  topProductName: string | null;
  topProductQty: number;
  pendingPaymentCount: number;
  shippedPendingCount: number;
  availableBalance: number;
};

type SalesInsightResult = {
  summary: string | null;
  metrics: SalesInsightMetrics;
  aiAvailable: boolean;
};

const INSIGHT_DAYS = 30;

// Self-contained card: fetches its own data on mount instead of riding the
// shared dashboard loader, so it can be dropped into `dashboard.index`
// without changing `getDashboardData`'s contract (that consolidation is
// tracked separately for the broader overview enrichment work).
export function SalesInsightCard() {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; data: SalesInsightResult } | { status: "error" }
  >({ status: "loading" });

  function loadInsight(regenerate: boolean) {
    setState({ status: "loading" });
    import("@/server/ai.functions")
      .then(({ generateSalesInsight }) =>
        generateSalesInsight({ data: { days: INSIGHT_DAYS, regenerate } }),
      )
      .then((data) => setState({ status: "ready", data }))
      .catch(() => setState({ status: "error" }));
  }

  useEffect(() => {
    loadInsight(false);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Ringkasan AI
        </span>
        {state.status === "ready" && (
          <button
            type="button"
            onClick={() => loadInsight(true)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors duration-200"
          >
            Perbarui
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div className="mt-6 flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Gagal memuat ringkasan toko. Coba muat ulang halaman.
        </p>
      )}

      {state.status === "ready" && (
        <div className="mt-4 space-y-3">
          {state.data.aiAvailable && state.data.summary ? (
            <p className="text-sm leading-relaxed text-foreground">{state.data.summary}</p>
          ) : (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Ringkasan AI belum tersedia saat ini. Berikut data mentahnya:</p>
              <p>
                Penjualan {INSIGHT_DAYS} hari terakhir:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(state.data.metrics.currentSalesTotal)}
                </span>
              </p>
              {state.data.metrics.topProductName && (
                <p>
                  Produk terlaris:{" "}
                  <span className="font-medium text-foreground">
                    {state.data.metrics.topProductName}
                  </span>{" "}
                  ({state.data.metrics.topProductQty} terjual)
                </p>
              )}
              <p>Order menunggu pembayaran: {state.data.metrics.pendingPaymentCount}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
