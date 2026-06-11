import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/lib/store";
import type { Product, ProductVariantGroup } from "@/lib/types";
import { formatIDR } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";
import { FallbackImage } from "@/components/fallback-image";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const tenant = useTenant((s) => s.tenant);
  const add = useTenant((s) => s.addProduct);
  const remove = useTenant((s) => s.removeProduct);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const products = tenant.products;

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Manajemen</span>
          <h1 className="font-display mt-2 text-4xl font-medium tracking-tight">Produk</h1>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition"
        >
          + Produk baru
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li
            key={p.id}
            className="group overflow-hidden rounded-2xl border border-border bg-card flex flex-col justify-between"
          >
            <div>
              <div className="aspect-square overflow-hidden bg-secondary relative">
                <FallbackImage
                  src={p.image}
                  alt={p.name}
                  fallbackText={p.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="font-display text-base font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatIDR(p.basePrice)}</div>

                {/* Variant groups display */}
                {p.variantGroups && p.variantGroups.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-border pt-3">
                    {p.variantGroups.map((g) => (
                      <div key={g.id} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{g.name}</span>:{" "}
                        {g.options.map((o) => o.name).join(", ")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 pt-0">
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 hover:bg-surface transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingProduct(p)}
                  className="rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-destructive transition"
                >
                  Hapus
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showForm && (
        <ProductForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            if (editing) {
              useTenant.getState().updateProduct(editing.id, data);
              toast.success(`Produk "${data.name}" berhasil diperbarui`);
            } else {
              add(data);
              toast.success(`Produk "${data.name}" berhasil ditambahkan`);
            }
            setShowForm(false);
          }}
        />
      )}

      <AnimatePresence>
        {deletingProduct && (
          <DeleteConfirmModal
            product={deletingProduct}
            onClose={() => setDeletingProduct(null)}
            onConfirm={() => {
              remove(deletingProduct.id);
              toast.success(`Produk "${deletingProduct.name}" berhasil dihapus`);
              setDeletingProduct(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Product | null;
  onClose: () => void;
  onSubmit: (data: Omit<Product, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);
  const [image, setImage] = useState(initial?.image ?? "");
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>(
    initial?.variantGroups ?? [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl flex flex-col rounded-2xl bg-background overflow-hidden shadow-2xl"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="font-display text-2xl font-medium">
            {initial ? "Edit produk" : "Produk baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-muted-foreground hover:text-foreground transition"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 hide-scrollbar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                name,
                description,
                basePrice: Number(basePrice),
                image:
                  image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
                variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
              });
            }}
            className="space-y-5"
          >
            <Field label="Nama">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
              />
            </Field>
            <Field label="Deskripsi">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="input"
              />
            </Field>
            <Field label="Harga dasar (Rp)">
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(+e.target.value)}
                required
                className="input"
              />
            </Field>
            <Field label="Gambar Produk">
              <ImageUpload value={image} onChange={(url) => setImage(url)} />
            </Field>

            {/* Variant groups builder section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Tipe Varian Produk
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVariantGroups([
                      ...variantGroups,
                      { id: crypto.randomUUID(), name: "", options: [] },
                    ])
                  }
                  className="text-xs text-accent hover:text-accent/80 bg-foreground text-background px-3 py-1.5 rounded-full font-medium transition"
                >
                  + Tipe Varian
                </button>
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
                        <Field label={`Nama Tipe Varian #${groupIdx + 1}`}>
                          <input
                            value={group.name}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              copy[groupIdx] = { ...group, name: e.target.value };
                              setVariantGroups(copy);
                            }}
                            placeholder="Contoh: Ukuran, Warna, Gilingan"
                            required
                            className="input"
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setVariantGroups(variantGroups.filter((_, idx) => idx !== groupIdx))
                        }
                        className="text-xs text-muted-foreground hover:text-destructive border border-border bg-background hover:bg-destructive/10 px-3 py-2.5 rounded-xl transition"
                      >
                        Hapus Grup
                      </button>
                    </div>

                    {/* Options inside this group */}
                    <div className="pl-4 border-l-2 border-border space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
                        Pilihan & Harga Ekstra
                      </span>

                      {group.options?.map((option, optionIdx) => (
                        <div key={option.id} className="flex gap-2 items-center">
                          <input
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
                            className="input flex-1"
                          />
                          <input
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
                            className="input w-28"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...variantGroups];
                              copy[groupIdx] = {
                                ...group,
                                options: group.options.filter((_, idx) => idx !== optionIdx),
                              };
                              setVariantGroups(copy);
                            }}
                            className="text-muted-foreground hover:text-foreground font-semibold px-1.5 py-1 text-base transition"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...variantGroups];
                          const opts = [...(group.options || [])];
                          opts.push({ id: crypto.randomUUID(), name: "", priceDelta: 0 });
                          copy[groupIdx] = { ...group, options: opts };
                          setVariantGroups(copy);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium transition"
                      >
                        + Tambah Pilihan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-foreground py-3.5 text-sm font-medium text-background hover:bg-foreground/90 transition duration-200 shrink-0"
            >
              {initial ? "Simpan perubahan" : "Tambah produk"}
            </button>
          </form>
        </div>
      </motion.div>

      <style>{`
        .input { width: 100%; border-radius: 10px; border: 1px solid var(--border); background: var(--background); padding: 10px 14px; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--foreground); }
      `}</style>
    </div>
  );
}

function DeleteConfirmModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <h3 className="font-display text-xl font-medium">Hapus produk?</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Apakah Anda yakin ingin menghapus produk{" "}
          <strong className="text-foreground">{product.name}</strong>? Tindakan ini tidak dapat
          dibatalkan.
        </p>
        <div className="mt-6 flex justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-background px-4 py-2 font-medium text-foreground hover:bg-surface transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-destructive px-4 py-2 font-medium text-destructive-foreground hover:bg-destructive/90 transition"
          >
            Hapus
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
