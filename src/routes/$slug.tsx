import { createFileRoute, notFound } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

import { getTenant } from "@/server/tenant.functions";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { ProductCard } from "@/components/storefront/product-card";
import { VariantSheet } from "@/components/storefront/variant-sheet";
import { FloatingCart } from "@/components/storefront/floating-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { recordAnalyticsEvent } from "@/server/analytics.functions";
import { getPublicUrl } from "@/lib/site-url";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    try {
      const tenant = await getTenant({ data: params.slug });
      if (!tenant) throw notFound();
      // Fire-and-forget: a real page view must never be delayed/blocked by
      // analytics persistence.
      recordAnalyticsEvent({ data: { tenantSlug: params.slug, event: "storefront_view" } }).catch(
        () => {},
      );
      return { tenant };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const tenant = loaderData?.tenant;
    const ogImage = tenant ? getPublicUrl(`/api/og/${tenant.slug}`) : getPublicUrl("/og-main.png");

    return {
      meta: [
        { title: tenant ? `${tenant.name} — Tokolink` : "Toko — Tokolink" },
        {
          name: "description",
          content: tenant?.tagline || "Kunjungi toko kami di Tokolink.",
        },
        { property: "og:title", content: tenant ? `${tenant.name} — Tokolink` : "Toko — Tokolink" },
        {
          property: "og:description",
          content: tenant?.tagline || "Kunjungi toko kami di Tokolink.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: getPublicUrl(`/${tenant?.slug || ""}`) },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: getPublicUrl(`/${tenant?.slug || ""}`) }],
    };
  },
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
  const [query, setQuery] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const storeUrl = getPublicUrl(`/${tenant.slug}`);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tenant.products.filter((product) => {
      if (activeCategoryId && product.categoryId !== activeCategoryId) return false;
      if (!normalized) return true;
      return [product.name, product.description].join(" ").toLowerCase().includes(normalized);
    });
  }, [activeCategoryId, query, tenant.products]);
  const cartProducts = useMemo(
    () =>
      tenant.products.map((p) => ({
        id: p.id,
        basePrice: p.basePrice,
        options: (p.variantGroups ?? []).flatMap((g) =>
          g.options.map((o) => ({ id: o.id ?? o.name, priceDelta: o.priceDelta })),
        ),
      })),
    [tenant.products],
  );

  const copyStoreLink = async () => {
    trackEvent("storefront_share_click", { tenantSlug: tenant.slug });
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Link toko disalin");
    } catch {
      toast.error("Gagal menyalin link. QR tetap tersedia.");
    }
    setShareOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: tenant.name,
          description: tenant.tagline,
          image: tenant.avatar,
          telephone: tenant.whatsapp,
          url: getPublicUrl(`/${tenant.slug}`),
          priceRange: "$$",
          itemListElement: tenant.products.map((p, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            item: {
              "@type": "Product",
              name: p.name,
              description: p.description,
              image: p.image,
              offers: {
                "@type": "Offer",
                price: p.basePrice,
                priceCurrency: "IDR",
                availability: "https://schema.org/InStock",
              },
            },
          })),
        })}
      </script>
      <StorefrontHeader tenant={tenant} />
      <section className="mx-auto mt-16 max-w-2xl px-4">
        <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <div className="mb-3 flex items-baseline justify-between px-2">
            <h2 className="font-display text-lg font-medium tracking-tight">Katalog</h2>
            <span className="text-xs text-muted-foreground">{filteredProducts.length} produk</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk..."
              className="bg-card"
            />
            <Button type="button" variant="outline" onClick={copyStoreLink}>
              Share
            </Button>
          </div>
          {tenant.categories.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition duration-200 ${
                  activeCategoryId === null
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                Semua
              </button>
              {tenant.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition duration-200 ${
                    activeCategoryId === category.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {shareOpen && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-medium">Link toko disalin</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(storeUrl)}`}
              alt={`QR code ${tenant.name}`}
              className="mx-auto mt-3 h-36 w-36 rounded-xl border border-border bg-white p-2"
            />
            <p className="mt-2 break-all text-xs text-muted-foreground">{storeUrl}</p>
          </div>
        )}
        {filteredProducts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {tenant.products.length === 0
              ? "Belum ada produk di toko ini."
              : "Produk tidak ditemukan. Coba kata kunci atau kategori lain."}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                delay={i * 0.04}
                onSelect={() => {
                  trackEvent("product_click", { tenantSlug: tenant.slug, productId: p.id });
                  setSelecting(p);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mx-auto mt-16 max-w-md px-6 text-center text-xs text-muted-foreground">
        powered by <span className="text-foreground">tokolink</span>
      </div>
      <AnimatePresence>
        {selecting && <VariantSheet product={selecting} onClose={() => setSelecting(null)} />}
      </AnimatePresence>

      <FloatingCart
        tenantSlug={tenant.slug}
        storeName={tenant.name}
        phone={tenant.whatsapp}
        whatsappTemplate={tenant.whatsappTemplate ?? ""}
        products={cartProducts}
      />
    </div>
  );
}
