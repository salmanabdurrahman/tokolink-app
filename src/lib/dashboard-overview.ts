// Pure CTA selection logic for `dashboard.index`, extracted so the
// conditional rules (onboarding vs. contextual order/saldo prompts) are
// covered by plain unit tests without needing to render the route.
export interface DashboardOverviewCta {
  key: string;
  index: string;
  title: string;
  description: string;
  to?: string;
  action?: "share";
}

export interface DashboardOverviewCtaInput {
  isNewTenant: boolean;
  whatsapp: string | null | undefined;
  pendingPaymentCount: number;
  orderCount: number;
  availableBalance: number;
  minWithdrawalAmount: number;
  formatCurrency: (value: number) => string;
}

export function buildDashboardCtas(input: DashboardOverviewCtaInput): DashboardOverviewCta[] {
  const ctas: DashboardOverviewCta[] = [];

  if (input.isNewTenant) {
    ctas.push({
      key: "add-product",
      index: "/01",
      title: "Tambah produk pertama",
      description: "Upload katalog produk lengkap dengan varian.",
      to: "/dashboard/products",
    });
  }

  if (!input.whatsapp) {
    ctas.push({
      key: "setup-whatsapp",
      index: "/02",
      title: "Atur nomor WhatsApp",
      description: "Pastikan checkout diarahkan ke nomor yang aktif.",
      to: "/dashboard/settings",
    });
  }

  if (!input.isNewTenant && (input.pendingPaymentCount > 0 || input.orderCount > 0)) {
    ctas.push({
      key: "process-orders",
      index: "/03",
      title: "Proses order baru",
      description: `${input.pendingPaymentCount} order menunggu bayar, ${input.orderCount} perlu dikirim.`,
      to: "/dashboard/orders",
    });
  }

  if (input.availableBalance >= input.minWithdrawalAmount) {
    ctas.push({
      key: "withdraw-balance",
      index: "/04",
      title: "Cairkan saldo",
      description: `Saldo tersedia ${input.formatCurrency(input.availableBalance)} siap dicairkan.`,
      to: "/dashboard/withdrawals",
    });
  }

  ctas.push({
    key: "share-store",
    index: "/05",
    title: "Lihat & bagikan toko",
    description: "Salin link toko untuk disebar di bio dan chat.",
    action: "share",
  });

  return ctas;
}
