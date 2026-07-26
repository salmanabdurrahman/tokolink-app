import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/lib/store";
import { useLoadedTenant } from "@/hooks/use-loaded-tenant";
import type { Product } from "@/lib/types";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/dashboard/product-form";
import { ProductCard } from "@/components/dashboard/product-card";
import { CategoryManager } from "@/components/dashboard/category-manager";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getMyTenantProducts } from "@/server/tenant.functions";
import { isExpectedLoaderError, logLoaderError } from "@/lib/loader-error";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/products")({
  staleTime: 15_000,
  loader: async () => {
    try {
      return { tenant: await getMyTenantProducts({}), loaderError: false };
    } catch (error) {
      logLoaderError("dashboard.products", error);
      return { tenant: null, loaderError: !isExpectedLoaderError(error) };
    }
  },
  component: ProductsPage,
});

function ProductsPage() {
  const { tenant: loadedTenant, loaderError } = Route.useLoaderData();
  const tenant = useLoadedTenant(loadedTenant);
  const add = useTenant((s) => s.addProduct);
  const remove = useTenant((s) => s.removeProduct);
  const reorderProducts = useTenant((s) => s.reorderProducts);
  const addCategory = useTenant((s) => s.addCategory);
  const updateCategory = useTenant((s) => s.updateCategory);
  const removeCategory = useTenant((s) => s.removeCategory);
  const reorderCategories = useTenant((s) => s.reorderCategories);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (!tenant) {
    if (loaderError) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat data produk. Periksa koneksi Anda dan coba muat ulang halaman.
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const products = tenant.products;
  const categories = tenant.categories;
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

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
      toast.error(getErrorMessage(err) || "Gagal menyimpan urutan produk");
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

      <CategoryManager
        categories={categories}
        onAdd={addCategory}
        onRename={(id, name) => updateCategory(id, { name })}
        onRemove={removeCategory}
        onReorder={reorderCategories}
      />

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
                categoryName={p.categoryId ? categoryNameById.get(p.categoryId) : undefined}
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
            categories={categories}
            onClose={() => setShowForm(false)}
            onGenerateCopy={async (input) => {
              const { generateProductCopy } = await import("@/server/ai.functions");
              return generateProductCopy({ data: input });
            }}
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
                const message = getErrorMessage(err) || "Gagal menyimpan produk";
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
                toast.error(getErrorMessage(err) || "Gagal menghapus produk");
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
