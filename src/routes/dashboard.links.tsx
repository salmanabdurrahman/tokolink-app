import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/links")({
  component: LinksPage,
});

function LinksPage() {
  const tenant = useTenant((s) => s.tenant);
  const add = useTenant((s) => s.addLink);
  const update = useTenant((s) => s.updateLink);
  const remove = useTenant((s) => s.removeLink);

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const links = tenant.links;

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Manajemen</span>
          <h1 className="font-display mt-2 text-4xl font-medium tracking-tight">Tautan</h1>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label || !url) return;
          add({ label, url });
          toast.success(`Tautan "${label}" berhasil ditambahkan`);
          setLabel("");
          setUrl("");
        }}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_2fr_auto]"
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (Instagram)"
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none"
        />
        <button className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition">
          + Tambah
        </button>
      </form>

      <ul className="divide-y divide-border border-y border-border">
        {links.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">Belum ada tautan.</li>
        )}
        {links.map((l) => (
          <li
            key={l.id}
            className="grid grid-cols-1 items-center gap-3 py-4 sm:grid-cols-[1fr_2fr_auto]"
          >
            <input
              value={l.label}
              onChange={(e) => update(l.id, { label: e.target.value })}
              className="bg-transparent text-sm focus:outline-none"
            />
            <input
              value={l.url}
              onChange={(e) => update(l.id, { url: e.target.value })}
              className="bg-transparent text-sm text-muted-foreground focus:outline-none focus:text-foreground"
            />
            <button
              onClick={() => {
                remove(l.id);
                toast.success(`Tautan "${l.label}" berhasil dihapus`);
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition"
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
