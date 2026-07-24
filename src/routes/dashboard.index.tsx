import { createFileRoute, Link } from "@tanstack/react-router";
import { useTenant } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const tenant = useTenant((s) => s.tenant);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const stats = [
    { label: "Produk aktif", value: tenant.products.length },
    { label: "Tautan", value: tenant.links.length },
    { label: "Status WA", value: tenant.whatsapp ? "Terhubung" : "Belum" },
  ];

  return (
    <div className="space-y-12 bg-background text-foreground animate-fade-in">
      <div className="space-y-4">
        <PageHeader label="Overview" title={`Halo, ${tenant.name}.`} />
        <p className="text-sm text-muted-foreground">
          URL toko-mu:{" "}
          <a
            href={`https://tokolink-v2.vercel.app/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-foreground font-semibold hover:underline"
          >
            tokolink-v2.vercel.app/{tenant.slug} ↗
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-8">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="font-display mt-3 text-5xl font-light tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/dashboard/products"
          className="group rounded-2xl border border-border bg-card p-8 transition hover:border-foreground/30"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-muted-foreground">/01</span>
            <span className="text-muted-foreground group-hover:text-foreground">→</span>
          </div>
          <h3 className="font-display mt-12 text-2xl font-medium">Tambah produk baru</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload katalog produk lengkap dengan varian.
          </p>
        </Link>
        <Link
          to="/dashboard/settings"
          className="group rounded-2xl border border-border bg-card p-8 transition hover:border-foreground/30"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-muted-foreground">/02</span>
            <span className="text-muted-foreground group-hover:text-foreground">→</span>
          </div>
          <h3 className="font-display mt-12 text-2xl font-medium">Atur nomor WhatsApp</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Pastikan checkout diarahkan ke nomor yang aktif.
          </p>
        </Link>
      </div>
    </div>
  );
}
