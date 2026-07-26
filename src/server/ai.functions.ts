import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { enforceAuthRateLimit } from "./auth-abuse";
import { createJsonChatCompletion } from "./ai.server";
import { requireTenant } from "./tenant-context.server";
import { calculateAvailableBalance } from "./withdrawal.functions";

// --- AI product copy generator ---------------------------------------------

export const generateProductCopySchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi").max(100),
  keywords: z.string().max(200, "Kata kunci maksimal 200 karakter").default(""),
  categoryName: z.string().max(80).default(""),
});

const productCopyResultSchema = z.object({
  description: z
    .string()
    .min(5, "Deskripsi AI terlalu pendek")
    .max(500, "Deskripsi AI melebihi batas 500 karakter"),
  variantSuggestions: z.array(z.string().min(1).max(50)).max(5).default([]),
});

export const generateProductCopy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(generateProductCopySchema)
  .handler(async ({ data, context, request }: any) => {
    requireTenant(context);
    await enforceAuthRateLimit({ event: "ai_product_copy", userId: context.user.id, request });

    const system =
      "Anda asisten copywriting untuk UMKM Indonesia. Balas HANYA dengan JSON valid berbentuk " +
      '{"description": string, "variantSuggestions": string[]}. "description" adalah deskripsi ' +
      "produk toko online dalam Bahasa Indonesia, natural, maksimal 500 karakter, tanpa markdown. " +
      '"variantSuggestions" berisi maksimal 5 saran nama pilihan varian singkat (mis. ukuran, ' +
      "warna, rasa) yang relevan untuk produk ini, atau array kosong bila tidak relevan.";
    const user = [
      `Nama produk: ${data.name}`,
      data.categoryName ? `Kategori: ${data.categoryName}` : "",
      data.keywords ? `Kata kunci: ${data.keywords}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await createJsonChatCompletion({ system, user });
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error("AI tidak menghasilkan jawaban yang valid. Coba lagi.");
    }

    const parsed = productCopyResultSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new Error("AI tidak menghasilkan jawaban yang valid. Coba lagi.");
    }

    return parsed.data;
  });

// --- AI sales insight -------------------------------------------------------

const SALES_INSIGHT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const salesInsightCache = new Map<string, { expiresAt: number; summary: string }>();

export function __clearSalesInsightCacheForTests() {
  salesInsightCache.clear();
}

async function buildSalesMetrics(tenantId: string, days: number) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
  const paidStatuses = ["PAID", "SHIPPED", "COMPLETED"] as const;

  const [
    currentSales,
    previousSales,
    topProductRows,
    pendingPaymentCount,
    shippedPendingCount,
    availableBalance,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { tenantId, status: { in: [...paidStatuses] }, paidAt: { gte: periodStart } },
      _sum: { subtotal: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        status: { in: [...paidStatuses] },
        paidAt: { gte: previousStart, lt: periodStart },
      },
      _sum: { subtotal: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: {
        order: { tenantId, status: { in: [...paidStatuses] }, paidAt: { gte: periodStart } },
      },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 1,
    }),
    prisma.order.count({ where: { tenantId, status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { tenantId, status: "PAID" } }),
    calculateAvailableBalance(prisma, tenantId, now),
  ]);

  const currentTotal = currentSales._sum.subtotal || 0;
  const previousTotal = previousSales._sum.subtotal || 0;
  const salesDeltaPercent =
    previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : null;

  return {
    days,
    currentSalesTotal: currentTotal,
    previousSalesTotal: previousTotal,
    salesDeltaPercent,
    topProductName: topProductRows[0]?.productName || null,
    topProductQty: topProductRows[0]?._sum.qty || 0,
    pendingPaymentCount,
    shippedPendingCount,
    availableBalance,
  };
}

export const generateSalesInsightSchema = z
  .object({
    days: z.number().int().min(1).max(90),
    regenerate: z.boolean(),
  })
  .partial();

export const generateSalesInsight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(generateSalesInsightSchema)
  .handler(async ({ data, context, request }: any) => {
    const tenantId = requireTenant(context);
    const days = data.days ?? 30;
    const metrics = await buildSalesMetrics(tenantId, days);

    const cacheKey = `${tenantId}:${days}`;
    const cached = salesInsightCache.get(cacheKey);
    if (!data.regenerate && cached && cached.expiresAt > Date.now()) {
      return { summary: cached.summary, metrics, aiAvailable: true };
    }

    try {
      await enforceAuthRateLimit({ event: "ai_sales_insight", userId: context.user.id, request });

      const system =
        "Anda asisten bisnis untuk UMKM Indonesia. Balas HANYA dengan JSON valid berbentuk " +
        '{"summary": string}. "summary" adalah ringkasan performa toko dalam Bahasa Indonesia, ' +
        "2-4 kalimat, natural dan actionable, tanpa markdown, maksimal 600 karakter. Jangan " +
        "mengarang angka; gunakan hanya data yang diberikan.";
      const user = [
        `Total penjualan ${days} hari terakhir: Rp${metrics.currentSalesTotal}`,
        metrics.salesDeltaPercent === null
          ? "Tidak ada data periode sebelumnya untuk dibandingkan."
          : `Perubahan dibanding ${days} hari sebelumnya: ${metrics.salesDeltaPercent}%`,
        metrics.topProductName
          ? `Produk terlaris: ${metrics.topProductName} (${metrics.topProductQty} terjual)`
          : "Belum ada produk terjual pada periode ini.",
        `Order menunggu pembayaran: ${metrics.pendingPaymentCount}`,
        `Order dibayar menunggu dikirim: ${metrics.shippedPendingCount}`,
        `Saldo tersedia untuk dicairkan: Rp${metrics.availableBalance}`,
      ].join("\n");

      const raw = await createJsonChatCompletion({ system, user, maxOutputTokens: 400 });
      const parsedJson = JSON.parse(raw);
      const parsed = z.object({ summary: z.string().min(10).max(600) }).parse(parsedJson);

      salesInsightCache.set(cacheKey, {
        expiresAt: Date.now() + SALES_INSIGHT_CACHE_TTL_MS,
        summary: parsed.summary,
      });
      return { summary: parsed.summary, metrics, aiAvailable: true };
    } catch {
      // Graceful fallback: raw metrics are always returned so the dashboard
      // card can render numbers even when the AI provider is unavailable,
      // unconfigured, or rate-limited.
      return { summary: null, metrics, aiAvailable: false };
    }
  });
