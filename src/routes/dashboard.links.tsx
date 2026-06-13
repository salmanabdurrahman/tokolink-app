import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LinkForm } from "@/components/dashboard/link-form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/links")({
  component: LinksPage,
});

function LinksPage() {
  const tenant = useTenant((s) => s.tenant);
  const add = useTenant((s) => s.addLink);
  const update = useTenant((s) => s.updateLink);
  const remove = useTenant((s) => s.removeLink);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const links = tenant.links;

  const handleSave = (data: { label: string; url: string }) => {
    add(data);
    toast.success(`Tautan "${data.label}" berhasil ditambahkan`);
  };

  return (
    <div className="space-y-10 bg-background text-foreground animate-fade-in">
      <PageHeader label="Manajemen" title="Tautan" />

      <LinkForm onSave={handleSave} />

      <ul className="divide-y divide-border border-y border-border">
        {links.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">Belum ada tautan.</li>
        )}
        {links.map((l) => (
          <li
            key={l.id}
            className="grid grid-cols-1 items-center gap-3 py-4 sm:grid-cols-[1fr_2fr_auto]"
          >
            <Input
              value={l.label}
              onChange={(e) => update(l.id, { label: e.target.value })}
              className="bg-transparent border-none px-0 py-1 rounded-none focus:border-b focus:border-foreground"
            />
            <Input
              value={l.url}
              onChange={(e) => update(l.id, { url: e.target.value })}
              className="bg-transparent border-none px-0 py-1 rounded-none text-muted-foreground focus:text-foreground focus:border-b focus:border-foreground"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                remove(l.id);
                toast.success(`Tautan "${l.label}" berhasil dihapus`);
              }}
              className="text-xs text-muted-foreground hover:text-destructive shrink-0"
            >
              Hapus
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
