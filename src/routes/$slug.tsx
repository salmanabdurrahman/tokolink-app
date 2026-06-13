import { createFileRoute, notFound } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Product } from "@/lib/types";

import { getTenant } from "@/server/tenant.functions";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { ProductCard } from "@/components/storefront/product-card";
import { VariantSheet } from "@/components/storefront/variant-sheet";
import { FloatingCart } from "@/components/storefront/floating-cart";

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
  head: ({ loaderData }) => {
    const tenant = loaderData?.tenant;
    const ogImage = tenant
      ? `https://tokolink.app/api/og/${tenant.slug}`
      : "https://tokolink.app/og-main.png";

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
        { property: "og:url", content: `https://tokolink.app/${tenant?.slug || ""}` },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: `https://tokolink.app/${tenant?.slug || ""}` }],
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
          url: `https://tokolink.app/${tenant.slug}`,
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

      {/* Header */}
      <StorefrontHeader tenant={tenant} />

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
