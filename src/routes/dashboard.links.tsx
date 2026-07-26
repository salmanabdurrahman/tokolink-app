import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTenant } from "@/lib/store";
import { useLoadedTenant } from "@/hooks/use-loaded-tenant";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LinkForm } from "@/components/dashboard/link-form";
import { getMyTenantLinks } from "@/server/tenant.functions";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { isExpectedLoaderError, logLoaderError } from "@/lib/loader-error";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/links")({
  staleTime: 15_000,
  loader: async () => {
    try {
      return { tenant: await getMyTenantLinks({}), loaderError: false };
    } catch (error) {
      logLoaderError("dashboard.links", error);
      return { tenant: null, loaderError: !isExpectedLoaderError(error) };
    }
  },
  component: LinksPage,
});

function LinksPage() {
  const { tenant: loadedTenant, loaderError } = Route.useLoaderData();
  const tenant = useLoadedTenant(loadedTenant);
  const add = useTenant((s) => s.addLink);
  const update = useTenant((s) => s.updateLink);
  const remove = useTenant((s) => s.removeLink);
  const reorderLinks = useTenant((s) => s.reorderLinks);

  const [drafts, setDrafts] = useState<Record<string, { label: string; url: string }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const tenantLinks = tenant?.links;

  useEffect(() => {
    if (!tenantLinks) return;
    setDrafts(
      Object.fromEntries(
        tenantLinks.map((link) => [link.id, { label: link.label, url: link.url }]),
      ),
    );
  }, [tenantLinks]);

  if (!tenant) {
    if (loaderError) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data tautan. Periksa koneksi Anda dan coba muat ulang halaman.
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const links = tenant.links;

  const handleSave = async (data: { label: string; url: string }) => {
    setError("");
    try {
      await add(data);
      toast.success(`Tautan "${data.label}" berhasil ditambahkan`);
    } catch (err) {
      const message = getErrorMessage(err) || "Gagal menambah tautan";
      setError(message);
      toast.error(message);
    }
  };

  const persistLink = async (id: string) => {
    const current = links.find((link) => link.id === id);
    const draft = drafts[id];
    if (!current || !draft || (current.label === draft.label && current.url === draft.url)) return;
    if (!draft.label.trim()) {
      toast.error("Label harus diisi");
      setDrafts((value) => ({ ...value, [id]: { label: current.label, url: current.url } }));
      return;
    }
    setSavingId(id);
    setError("");
    try {
      await update(id, draft);
      toast.success(`Tautan "${draft.label}" disimpan`);
    } catch (err) {
      const message = getErrorMessage(err) || "Gagal menyimpan tautan";
      setError(message);
      toast.error(message);
      setDrafts((value) => ({ ...value, [id]: { label: current.label, url: current.url } }));
    } finally {
      setSavingId(null);
    }
  };

  const moveLink = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const from = links.findIndex((link) => link.id === draggingId);
    const to = links.findIndex((link) => link.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    try {
      await reorderLinks(next.map((link) => link.id));
      toast.success("Urutan tautan disimpan");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Gagal menyimpan urutan tautan");
    }
  };

  return (
    <div className="space-y-10 bg-background text-foreground animate-fade-in">
      <PageHeader label="Manajemen" title="Tautan" />

      <LinkForm onSave={handleSave} />

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {links.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-medium">Belum ada tautan</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Tambahkan Instagram, marketplace, atau kontak supaya pembeli punya jalur cepat ke toko.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {links.map((l) => (
            <li
              key={l.id}
              draggable
              onDragStart={() => setDraggingId(l.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => moveLink(l.id)}
              onDragEnd={() => setDraggingId(null)}
              className={`grid grid-cols-1 items-center gap-3 py-4 sm:grid-cols-[1fr_2fr_auto] ${draggingId === l.id ? "opacity-60" : ""}`}
            >
              <Input
                value={drafts[l.id]?.label ?? l.label}
                onChange={(e) =>
                  setDrafts((value) => ({
                    ...value,
                    [l.id]: { label: e.target.value, url: value[l.id]?.url ?? l.url },
                  }))
                }
                onBlur={() => persistLink(l.id)}
                className="bg-transparent border-none px-0 py-1 rounded-none focus:border-b focus:border-foreground"
              />
              <Input
                value={drafts[l.id]?.url ?? l.url}
                onChange={(e) =>
                  setDrafts((value) => ({
                    ...value,
                    [l.id]: { label: value[l.id]?.label ?? l.label, url: e.target.value },
                  }))
                }
                onBlur={() => persistLink(l.id)}
                className="bg-transparent border-none px-0 py-1 rounded-none text-muted-foreground focus:text-foreground focus:border-b focus:border-foreground"
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={savingId === l.id}
                onClick={async () => {
                  try {
                    await remove(l.id);
                    toast.success(`Tautan "${l.label}" berhasil dihapus`);
                  } catch (err) {
                    toast.error(getErrorMessage(err) || "Gagal menghapus tautan");
                  }
                }}
                className="text-xs text-muted-foreground hover:text-destructive shrink-0"
              >
                {savingId === l.id ? "Menyimpan..." : "Hapus"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
