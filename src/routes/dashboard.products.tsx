import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTenant } from "@/lib/store";
import type { Product } from "@/lib/types";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/dashboard/product-form";
import { ProductCard } from "@/components/dashboard/product-card";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getMyTenantProducts } from "@/server/tenant.functions";

export const Route = createFileRoute("/dashboard/products")({
  loader: async () => {
    try {
      return { tenant: await getMyTenantProducts({}) };
    } catch {
      return { tenant: null };
    }
  },
  component: ProductsPage,
});

function ProductsPage() {
  const { tenant: loadedTenant } = Route.useLoaderData();
  const storeTenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const add = useTenant((s) => s.addProduct);
  const remove = useTenant((s) => s.removeProduct);
  const reorderProducts = useTenant((s) => s.reorderProducts);
  const [hasHydratedTenant, setHasHydratedTenant] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const tenant = hasHydratedTenant ? storeTenant : loadedTenant;

  useEffect(() => {
    if (!loadedTenant) return;
    setTenant(loadedTenant as any);
    setHasHydratedTenant(true);
  }, [loadedTenant, setTenant]);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const products = tenant.products;

  const moveProduct = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const from = products.findIndex((product) => product.id === draggingId);
    const to = products.findIndex((product) => product.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...products];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    try {
      await reorderProducts(next.map((product) => product.id));
      toast.success("Urutan produk disimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan urutan produk");
    }
  };

  const headerAction = (
    <Button
      onClick={() => {
        setEditing(null);
        setShowForm(true);
      }}
    >
      + Produk baru
    </Button>
  );

  return (
    <div className="space-y-10 bg-background text-foreground animate-fade-in">
      <PageHeader label="Manajemen" title="Produk" action={headerAction} />

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-medium">Belum ada produk</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Tambahkan produk pertama agar pembeli bisa mulai checkout dari storefront.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="mt-4"
          >
            + Produk baru
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDraggingId(p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => moveProduct(p.id)}
              onDragEnd={() => setDraggingId(null)}
              className={draggingId === p.id ? "opacity-60" : ""}
            >
              <ProductCard
                product={p}
                onEdit={() => {
                  setEditing(p);
                  setShowForm(true);
                }}
                onDelete={() => setDeletingProduct(p)}
              />
            </div>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {showForm && (
          <ProductForm
            initial={editing}
            onClose={() => setShowForm(false)}
            onSubmit={async (data) => {
              setError("");
              try {
                if (editing) {
                  await useTenant.getState().updateProduct(editing.id, data);
                  toast.success(`Produk "${data.name}" berhasil diperbarui`);
                } else {
                  await add(data);
                  toast.success(`Produk "${data.name}" berhasil ditambahkan`);
                }
                setShowForm(false);
              } catch (err) {
                const message = err instanceof Error ? err.message : "Gagal menyimpan produk";
                setError(message);
                toast.error(message);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingProduct && (
          <DeleteConfirmModal
            product={deletingProduct}
            onClose={() => setDeletingProduct(null)}
            onConfirm={async () => {
              try {
                await remove(deletingProduct.id);
                toast.success(`Produk "${deletingProduct.name}" berhasil dihapus`);
                setDeletingProduct(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Gagal menghapus produk");
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
