import { createFileRoute, notFound } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { buildWhatsAppUrl, useCart } from "@/lib/store";
import { formatIDR } from "@/lib/utils";
import type { Product, ProductVariantOption } from "@/lib/types";
import { toast } from "sonner";
import { FallbackImage } from "@/components/fallback-image";

import { getTenant } from "@/server/tenant.functions";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    try {
      const tenant = await getTenant({ data: params.slug });
      if (!tenant) throw notFound();
      return { tenant };
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Tokolink` },
      { name: "description", content: `Storefront ${params.slug} via Tokolink.` },
    ],
  }),
  component: Storefront,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-5xl">404</h1>
        <p className="mt-2 text-muted-foreground">Toko tidak ditemukan.</p>
      </div>
    </div>
  ),
});

function Storefront() {
  const { tenant } = Route.useLoaderData();

  const [selecting, setSelecting] = useState<Product | null>(null);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-6 pt-12">
        <div className="mx-auto max-w-md text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto h-20 w-20 rounded-full border-4 border-card overflow-hidden shadow-sm"
          >
            <FallbackImage
              src={tenant.avatar}
              alt={tenant.name}
              fallbackText={tenant.name}
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.h1
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-display mt-5 text-3xl font-medium tracking-tight"
          >
            {tenant.name}
          </motion.h1>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-2 text-sm text-muted-foreground text-pretty"
          >
            {tenant.tagline}
          </motion.p>
        </div>
      </header>

      {/* Quick links */}
      <section className="mx-auto mt-8 max-w-md px-6">
        <div className="flex flex-wrap justify-center gap-2">
          {tenant.links.map((l, i) => (
            <motion.a
              key={l.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm transition hover:bg-foreground hover:text-background"
            >
              {l.label} ↗
            </motion.a>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section className="mx-auto mt-16 max-w-2xl px-4">
        <div className="mb-6 flex items-baseline justify-between px-2">
          <h2 className="font-display text-lg font-medium tracking-tight">Katalog</h2>
          <span className="text-xs text-muted-foreground">{tenant.products.length} produk</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tenant.products.map((p, i) => (
            <ProductCard key={p.id} product={p} delay={i * 0.04} onSelect={() => setSelecting(p)} />
          ))}
        </div>
      </section>

      <div className="mx-auto mt-16 max-w-md px-6 text-center text-xs text-muted-foreground">
        powered by <span className="text-foreground">tokolink</span>
      </div>

      {/* Variant selection sheet */}
      <AnimatePresence>
        {selecting && <VariantSheet product={selecting} onClose={() => setSelecting(null)} />}
      </AnimatePresence>

      <FloatingCart storeName={tenant.name} phone={tenant.whatsapp} />
    </div>
  );
}

function ProductCard({
  product,
  delay,
  onSelect,
}: {
  product: Product;
  delay: number;
  onSelect: () => void;
}) {
  const add = useCart((s) => s.add);
  const hasVariants = product.variantGroups && product.variantGroups.length > 0;

  const handleAdd = () => {
    if (hasVariants) {
      onSelect();
    } else {
      add({
        key: product.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.basePrice,
        qty: 1,
        image: product.image,
      });
      toast.success(`"${product.name}" ditambahkan ke keranjang`);
    }
  };

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="overflow-hidden rounded-2xl border border-border bg-card flex flex-col justify-between"
    >
      <div className="aspect-square overflow-hidden bg-secondary relative">
        <FallbackImage
          src={product.image}
          alt={product.name}
          fallbackText={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="font-display text-sm font-medium leading-snug">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatIDR(product.basePrice)}</div>
        </div>
        <button
          onClick={handleAdd}
          className="mt-3 w-full rounded-full bg-foreground py-2 text-xs font-medium text-background hover:bg-foreground/90 transition"
        >
          + Keranjang
        </button>
      </div>
    </motion.div>
  );
}

function VariantSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const add = useCart((s) => s.add);

  // Set the first option as selected for each variant group
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ProductVariantOption>>(
    () => {
      const initial: Record<string, ProductVariantOption> = {};
      product.variantGroups?.forEach((g) => {
        if (g.options?.[0]) {
          initial[g.id] = g.options[0];
        }
      });
      return initial;
    },
  );

  // Calculate final unit price
  const price =
    product.basePrice +
    Object.values(selectedOptions).reduce((sum, opt) => sum + opt.priceDelta, 0);

  const allSelected =
    product.variantGroups?.every((g) => selectedOptions[g.id] !== undefined) ?? true;

  const handleAdd = () => {
    if (!allSelected) return;
    const selectedArray = Object.values(selectedOptions);
    const optionIds = selectedArray.map((o) => o.id).join(",");
    const optionNames = selectedArray.map((o) => o.name).join(", ");

    add({
      key: `${product.id}-${selectedArray.map((o) => o.id).join("-")}`,
      productId: product.id,
      productName: product.name,
      variantId: optionIds,
      variantName: optionNames,
      unitPrice: price,
      qty: 1,
      image: product.image,
    });
    toast.success(`"${product.name} (${optionNames})" ditambahkan ke keranjang`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm p-4 sm:items-center"
    >
      <motion.div
        initial={{ y: "100%", scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: "100%", scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-background p-6 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border shrink-0" />
        <div className="flex gap-4 shrink-0">
          <FallbackImage
            src={product.image}
            alt={product.name}
            fallbackText={product.name}
            className="h-20 w-20 rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="font-display text-lg font-medium">{product.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{formatIDR(price)}</div>
          </div>
        </div>

        {/* Scrollable variant options list */}
        <div className="mt-4 overflow-y-auto pr-1 space-y-5 flex-1 min-h-0 hide-scrollbar">
          {product.variantGroups?.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Pilih {group.name}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.options?.map((option) => {
                  const isSelected = selectedOptions[group.id]?.id === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() =>
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [group.id]: option,
                        }))
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {option.name}
                      {option.priceDelta > 0 && (
                        <span className="ml-1 text-xs opacity-75">
                          +{formatIDR(option.priceDelta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAdd}
          disabled={!allSelected}
          className="mt-6 w-full rounded-full bg-foreground py-3.5 text-sm font-medium text-background hover:bg-foreground/90 transition shrink-0"
        >
          Tambah ke keranjang — {formatIDR(price)}
        </button>
      </motion.div>
    </motion.div>
  );
}

function FloatingCart({ storeName, phone }: { storeName: string; phone: string }) {
  const items = useCart((s) => s.items);
  const totalQty = useCart((s) => s.totalQty());
  const totalPrice = useCart((s) => s.totalPrice());
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const clear = useCart((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (totalQty === 0) return null;

  const checkout = () => {
    const url = buildWhatsAppUrl(phone, storeName, items, totalPrice, note);
    window.open(url, "_blank");
    toast.success("Mengarahkan ke WhatsApp...");
    clear();
    setNote("");
    setOpen(false);
  };

  return (
    <>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground p-2 pl-5 text-background shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition duration-200"
      >
        <span className="text-sm">
          <span className="font-medium">{totalQty} item</span>
          <span className="mx-2 opacity-40">·</span>
          <span>{formatIDR(totalPrice)}</span>
        </span>
        <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-foreground">
          Lihat keranjang →
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-md flex flex-col rounded-2xl bg-background p-6 shadow-2xl overflow-hidden"
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border shrink-0" />
              <h3 className="font-display text-2xl font-medium shrink-0">Keranjang</h3>

              <ul className="mt-4 divide-y divide-border overflow-y-auto flex-1 pr-1 hide-scrollbar">
                {items.map((i) => (
                  <li key={i.key} className="flex items-center gap-3 py-3">
                    <FallbackImage
                      src={i.image}
                      alt={i.productName}
                      fallbackText={i.productName}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{i.productName}</div>
                      {i.variantName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {i.variantName}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{formatIDR(i.unitPrice)}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      <button
                        onClick={() => dec(i.key)}
                        className="h-7 w-7 rounded-full border border-border hover:bg-surface transition"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-medium">{i.qty}</span>
                      <button
                        onClick={() => inc(i.key)}
                        className="h-7 w-7 rounded-full border border-border hover:bg-surface transition"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Order Notes Field */}
              <div className="mt-4 space-y-1.5 shrink-0">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Catatan Pesanan (opsional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Titip di pos satpam, request gilingan kasar, dll."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-foreground transition resize-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 shrink-0">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-2xl font-medium">{formatIDR(totalPrice)}</span>
              </div>

              <button
                onClick={checkout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 text-sm font-medium text-foreground hover:scale-[1.01] active:scale-[0.98] transition shrink-0"
              >
                Checkout via WhatsApp →
              </button>
              <button
                onClick={() => clear()}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive transition shrink-0"
              >
                Kosongkan keranjang
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
