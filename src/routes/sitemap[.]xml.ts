import { createFileRoute } from "@tanstack/react-router";
import { listSitemapTenants } from "../server/catalog.queries.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let tenants: Array<{ slug: string; updatedAt: Date }> = [];
        try {
          tenants = await listSitemapTenants();
        } catch (err) {
          console.error("Failed to fetch tenants for sitemap:", err);
        }

        const baseUrl = "https://tokolink-v2.vercel.app";

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/auth</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  ${tenants
    .map(
      (tenant) => `
  <url>
    <loc>${baseUrl}/${tenant.slug}</loc>
    <lastmod>${tenant.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("")}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml",
          },
        });
      },
    },
  },
});
