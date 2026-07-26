import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDateTimeIndonesia, formatPercentIndonesia } from "@/lib/formatters";
import { formatIDR } from "@/lib/utils";
import { withdrawalStatusLabels } from "@/lib/status-labels";
import { isExpectedLoaderError, logLoaderError } from "@/lib/loader-error";

export const Route = createFileRoute("/dashboard/withdrawals")({
  loader: async () => {
    try {
      const { getTenantWithdrawalSummary } = await import("@/server/withdrawal.functions");
      const summary = await getTenantWithdrawalSummary({});
      return { summary, loaderError: false };
    } catch (error) {
      logLoaderError("dashboard.withdrawals", error);
      return {
        loaderError: !isExpectedLoaderError(error),
        summary: {
          availableBalance: 0,
          pendingBalance: 0,
          minimumWithdrawal: 50_000,
          feeRate: 0.015,
          holdDays: 2,
          withdrawals: [],
        },
      };
    }
  },
  component: WithdrawalsPage,
});

function statusLabel(status: string) {
  return withdrawalStatusLabels[status as keyof typeof withdrawalStatusLabels] || status;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return formatDateTimeIndonesia(value);
}

function WithdrawalsPage() {
  const { summary, loaderError } = Route.useLoaderData();
  const router = useRouter();
  const [amount, setAmount] = useState(String(summary.availableBalance || ""));
  const [saving, setSaving] = useState(false);
  const parsedAmount = Number(amount || 0);
  const canRequest =
    parsedAmount >= summary.minimumWithdrawal &&
    parsedAmount <= summary.availableBalance &&
    !saving;

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      const { requestWithdrawal } = await import("@/server/withdrawal.functions");
      await requestWithdrawal({ data: { amount: parsedAmount } });
      await router.invalidate();
      toast.success("Request pencairan dibuat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat request pencairan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 bg-background text-foreground">
      <PageHeader label="Pencairan" title="Saldo & withdrawal" />

      {loaderError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data pencairan. Periksa koneksi Anda dan coba muat ulang halaman.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Saldo tersedia
          </p>
          <h2 className="mt-3 font-display text-4xl font-light tracking-tight">
            {formatIDR(summary.availableBalance)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Bisa diajukan untuk payout manual.</p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Saldo hold
          </p>
          <h2 className="mt-3 font-display text-4xl font-light tracking-tight">
            {formatIDR(summary.pendingBalance)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Masuk saldo tersedia H+{summary.holdDays} setelah order dibayar.
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Policy
          </p>
          <h2 className="mt-3 font-display text-4xl font-light tracking-tight">
            {formatPercentIndonesia(summary.feeRate * 100)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fee dari subtotal produk. Minimum pencairan {formatIDR(summary.minimumWithdrawal)}.
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submitWithdrawal} className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <WalletCards className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-medium">Request pencairan</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Payout diproses manual di luar sistem. Pastikan nominal tidak melebihi saldo tersedia.
          </p>
          <div className="mt-5 grid gap-4">
            <Field label="Nominal">
              <Input
                type="number"
                min={summary.minimumWithdrawal}
                max={summary.availableBalance}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="50000"
              />
            </Field>
            <Button type="submit" disabled={!canRequest}>
              {saving ? "Mengirim..." : "Ajukan pencairan"}
            </Button>
          </div>
        </form>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-medium">Riwayat pencairan</h2>
          {summary.withdrawals.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Belum ada request pencairan.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {summary.withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-semibold">{formatIDR(withdrawal.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      Diminta {formatDate(withdrawal.requestedAt)}
                    </p>
                  </div>
                  <Badge>{statusLabel(withdrawal.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
