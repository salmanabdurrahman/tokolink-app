import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
        <Spinner size="md" />
      </div>
    );
  }

  const products = tenant.products;

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

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onEdit={() => {
              setEditing(p);
              setShowForm(true);
            }}
            onDelete={() => setDeletingProduct(p)}
          />
        ))}
      </ul>

      <AnimatePresence>
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
      </AnimatePresence>

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
