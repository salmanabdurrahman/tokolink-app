import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Product, ProductCategory, ProductVariantGroup } from "@/lib/types";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { createProductSchema } from "@/lib/schemas";

interface ProductFormProps {
  initial: Product | null;
  categories?: ProductCategory[];
  onClose: () => void;
  onSubmit: (data: Omit<Product, "id">) => void | Promise<void>;
}

export function ProductForm({ initial, categories = [], onClose, onSubmit }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);
  const [image, setImage] = useState(initial?.image ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? false);
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>(
    initial?.variantGroups ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initial?.name ?? "",
        description: initial?.description ?? "",
        basePrice: initial?.basePrice ?? 0,
        image: initial?.image ?? "",
        categoryId: initial?.categoryId ?? "",
        trackStock: initial?.trackStock ?? false,
        stock: initial?.stock ?? 0,
        variantGroups: initial?.variantGroups ?? [],
      }),
    [initial],
  );
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        basePrice,
        image,
        categoryId,
        trackStock,
        stock,
        variantGroups,
      }),
    [basePrice, categoryId, description, image, name, stock, trackStock, variantGroups],
  );
  const isDirty = initialSnapshot !== currentSnapshot;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const closeForm = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center p-4"
      onClick={closeForm}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl flex flex-col rounded-2xl bg-background overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="font-display text-2xl font-medium text-foreground">
            {initial ? "Edit produk" : "Produk baru"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closeForm}
            aria-label="Tutup form"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 hide-scrollbar">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = {
                name,
                description,
                basePrice: Number(basePrice),
                image:
                  image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
                categoryId: categoryId || null,
                trackStock,
                stock: trackStock ? Number(stock) : null,
                variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
              };
              const parsed = createProductSchema.safeParse(data);
              if (!parsed.success) {
                const nextErrors: Record<string, string> = {};
                parsed.error.issues.forEach((issue) => {
                  nextErrors[issue.path.join(".") || "form"] = issue.message;
                });
                setErrors(nextErrors);
                return;
              }
              setErrors({});
              setSubmitting(true);
              try {
                await onSubmit(parsed.data);
              } finally {
                setSubmitting(false);
              }
            }}
            className="space-y-5"
          >
            <Field label="Nama">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </Field>
            <Field label="Deskripsi">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-destructive">{errors.description}</p>
              )}
            </Field>
            <Field label="Harga dasar (Rp)">
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(+e.target.value)}
                required
              />
              {errors.basePrice && (
                <p className="mt-1 text-xs text-destructive">{errors.basePrice}</p>
              )}
            </Field>
            <Field label="Gambar produk">
              <ImageUpload value={image} onChange={(url) => setImage(url)} />
            </Field>
            <Field label="Kategori">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Tanpa kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-foreground"
                />
                Lacak stok produk ini
              </label>
              {trackStock && (
                <Field label="Jumlah stok">
                  <Input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(+e.target.value)}
                    required
                  />
                  {errors.stock && <p className="mt-1 text-xs text-destructive">{errors.stock}</p>}
                </Field>
              )}
            </div>
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Tipe varian produk
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setVariantGroups([
                      ...variantGroups,
                      { id: crypto.randomUUID(), name: "", options: [] },
                    ])
                  }
                >
                  + Tipe varian
                </Button>
              </div>

              {variantGroups.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
                  Belum ada tipe varian. Tambahkan varian jika produk memiliki pilihan seperti
                  Ukuran, Warna, dll.
                </div>
              )}

              <div className="space-y-4">
                {variantGroups.map((group, groupIdx) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-border p-4 bg-muted/20 space-y-4 relative"
                  >
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Field label={`Nama tipe varian #${groupIdx + 1}`}>
                          <Input
                            value={group.name}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              copy[groupIdx] = { ...group, name: e.target.value };
                              setVariantGroups(copy);
                            }}
                            placeholder="Contoh: Ukuran, Warna, Gilingan"
                            required
                          />
                        </Field>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setVariantGroups(variantGroups.filter((_, idx) => idx !== groupIdx))
                        }
                        className="text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        Hapus grup
                      </Button>
                    </div>
                    <div className="pl-4 border-l-2 border-border space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
                        Pilihan & harga ekstra
                      </span>

                      {group.options?.map((option, optionIdx) => (
                        <div key={option.id} className="flex gap-2 items-center">
                          <Input
                            value={option.name}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              const opts = [...group.options];
                              opts[optionIdx] = { ...option, name: e.target.value };
                              copy[groupIdx] = { ...group, options: opts };
                              setVariantGroups(copy);
                            }}
                            placeholder="Pilihan (mis. M, Merah, Biji)"
                            required
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={option.priceDelta || ""}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              const opts = [...group.options];
                              opts[optionIdx] = { ...option, priceDelta: Number(e.target.value) };
                              copy[groupIdx] = { ...group, options: opts };
                              setVariantGroups(copy);
                            }}
                            placeholder="+Harga (Rp)"
                            className="w-32 shrink-0"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            aria-label="Hapus pilihan"
                            onClick={() => {
                              const copy = [...variantGroups];
                              copy[groupIdx] = {
                                ...group,
                                options: group.options.filter((_, idx) => idx !== optionIdx),
                              };
                              setVariantGroups(copy);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0 hover:bg-transparent"
                        onClick={() => {
                          const copy = [...variantGroups];
                          const opts = [...(group.options || [])];
                          opts.push({ id: crypto.randomUUID(), name: "", priceDelta: 0 });
                          copy[groupIdx] = { ...group, options: opts };
                          setVariantGroups(copy);
                        }}
                      >
                        + Tambah pilihan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full shrink-0 py-3.5">
              {submitting ? "Menyimpan..." : initial ? "Simpan perubahan" : "Tambah produk"}
            </Button>
          </form>
        </div>
      </motion.div>

      <Modal open={showCloseConfirm} onClose={() => setShowCloseConfirm(false)}>
        <h3 className="font-display text-xl font-medium text-foreground">Tutup form?</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Perubahan belum disimpan. Apakah Anda yakin ingin menutup form ini?
        </p>
        <div className="mt-6 flex justify-end gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={() => setShowCloseConfirm(false)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setShowCloseConfirm(false);
              onClose();
            }}
          >
            Tutup tanpa menyimpan
          </Button>
        </div>
      </Modal>
    </div>
  );
}
