import { createFileRoute, Link } from "@tanstack/react-router";
import { useTenant } from "@/lib/store";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const tenant = useTenant((s) => s.tenant);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: "Produk aktif", value: tenant.products.length },
    { label: "Tautan", value: tenant.links.length },
    { label: "Status WA", value: tenant.whatsapp ? "Terhubung" : "Belum" },
  ];

  return (
    <div className="space-y-12">
      <div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Overview</span>
        <h1 className="font-display mt-2 text-5xl font-medium tracking-tight">
          Halo, {tenant.name}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          URL toko-mu: <span className="text-foreground">tokolink.app/{tenant.slug}</span>
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
