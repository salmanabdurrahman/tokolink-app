import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductCategory } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategorySchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

interface CategoryManagerProps {
  categories: ProductCategory[];
  onAdd: (data: { name: string }) => void | Promise<void>;
  onRename: (id: string, name: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onReorder: (ids: string[]) => void | Promise<void>;
}

export function CategoryManager({
  categories,
  onAdd,
  onRename,
  onRemove,
  onReorder,
}: CategoryManagerProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createCategorySchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nama kategori tidak valid");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onAdd({ name: parsed.data.name });
      setName("");
    } finally {
      setSubmitting(false);
    }
  };

  const moveCategory = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const from = categories.findIndex((category) => category.id === draggingId);
    const to = categories.findIndex((category) => category.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    try {
      await onReorder(next.map((category) => category.id));
      toast.success("Urutan kategori disimpan");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Gagal menyimpan urutan kategori");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Kategori produk
      </h3>

      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori (mis. Minuman)"
          />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Menambah..." : "+ Tambah"}
        </Button>
      </form>

      {categories.length > 0 && (
        <ul className="divide-y divide-border">
          {categories.map((category) => (
            <li
              key={category.id}
              draggable
              onDragStart={() => setDraggingId(category.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => moveCategory(category.id)}
              onDragEnd={() => setDraggingId(null)}
              className={cn(
                "flex items-center gap-3 py-2",
                draggingId === category.id && "opacity-60",
              )}
            >
              <Input
                defaultValue={category.name}
                key={`${category.id}-${category.name}`}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== category.name) onRename(category.id, value);
                }}
                className="bg-transparent border-none px-0 py-1 rounded-none focus:border-b focus:border-foreground"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await onRemove(category.id);
                    toast.success(`Kategori "${category.name}" berhasil dihapus`);
                  } catch (err) {
                    toast.error(getErrorMessage(err) || "Gagal menghapus kategori");
                  }
                }}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
