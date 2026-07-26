import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    order: { aggregate: vi.fn(), count: vi.fn() },
    orderItem: { groupBy: vi.fn() },
    ledgerEntry: { aggregate: vi.fn() },
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./auth-abuse", () => ({ enforceAuthRateLimit: vi.fn() }));
vi.mock("./ai.server", () => ({ createJsonChatCompletion: vi.fn() }));

import { prisma } from "../db";
import { enforceAuthRateLimit } from "./auth-abuse";
import { createJsonChatCompletion } from "./ai.server";
import {
  __clearSalesInsightCacheForTests,
  generateProductCopy,
  generateSalesInsight,
} from "./ai.functions";

const generateProductCopyHandler = generateProductCopy as any;
const generateSalesInsightHandler = generateSalesInsight as any;
const tenantContext = { tenant: { id: "tenant-1" }, user: { id: "user-1" } };

function mockSalesQueries() {
  vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: { subtotal: 100000 } } as any);
  vi.mocked(prisma.orderItem.groupBy).mockResolvedValue([
    { productName: "Kopi Susu", _sum: { qty: 10 } },
  ] as any);
  vi.mocked(prisma.order.count).mockResolvedValue(2 as any);
  vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { amount: 50000 } } as any);
}

describe("generateProductCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws without tenant context", async () => {
    await expect(
      generateProductCopyHandler({
        data: { name: "Kopi", keywords: "", categoryName: "" },
        context: { user: { id: "user-1" } },
      }),
    ).rejects.toThrow("Toko tidak ditemukan");
  });

  it("enforces AI rate limit before calling provider", async () => {
    vi.mocked(createJsonChatCompletion).mockResolvedValue(
      JSON.stringify({ description: "Kopi arabika segar.", variantSuggestions: ["250g", "500g"] }),
    );

    await generateProductCopyHandler({
      data: { name: "Kopi Arabika", keywords: "gayo, single origin", categoryName: "" },
      context: tenantContext,
    });

    expect(enforceAuthRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ event: "ai_product_copy", userId: "user-1" }),
    );
  });

  it("returns validated description and variant suggestions", async () => {
    vi.mocked(createJsonChatCompletion).mockResolvedValue(
      JSON.stringify({ description: "Kopi arabika segar.", variantSuggestions: ["250g", "500g"] }),
    );

    await expect(
      generateProductCopyHandler({
        data: { name: "Kopi Arabika", keywords: "", categoryName: "" },
        context: tenantContext,
      }),
    ).resolves.toEqual({
      description: "Kopi arabika segar.",
      variantSuggestions: ["250g", "500g"],
    });
  });

  it("rejects invalid JSON output from provider", async () => {
    vi.mocked(createJsonChatCompletion).mockResolvedValue("not json");

    await expect(
      generateProductCopyHandler({
        data: { name: "Kopi", keywords: "", categoryName: "" },
        context: tenantContext,
      }),
    ).rejects.toThrow("AI tidak menghasilkan jawaban yang valid");
  });

  it("rejects output that fails schema validation", async () => {
    vi.mocked(createJsonChatCompletion).mockResolvedValue(JSON.stringify({ description: "" }));

    await expect(
      generateProductCopyHandler({
        data: { name: "Kopi", keywords: "", categoryName: "" },
        context: tenantContext,
      }),
    ).rejects.toThrow("AI tidak menghasilkan jawaban yang valid");
  });

  it("propagates provider errors (timeout/network/config)", async () => {
    vi.mocked(createJsonChatCompletion).mockRejectedValue(
      new Error("AI terlalu lama merespons. Coba lagi."),
    );

    await expect(
      generateProductCopyHandler({
        data: { name: "Kopi", keywords: "", categoryName: "" },
        context: tenantContext,
      }),
    ).rejects.toThrow("AI terlalu lama merespons");
  });
});

describe("generateSalesInsight", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __clearSalesInsightCacheForTests();
  });

  it("throws without tenant context", async () => {
    await expect(
      generateSalesInsightHandler({ data: {}, context: { user: { id: "user-1" } } }),
    ).rejects.toThrow("Toko tidak ditemukan");
  });

  it("returns AI summary plus raw metrics on success", async () => {
    mockSalesQueries();
    vi.mocked(createJsonChatCompletion).mockResolvedValue(
      JSON.stringify({ summary: "Penjualan meningkat dibanding bulan lalu." }),
    );

    const result = await generateSalesInsightHandler({ data: {}, context: tenantContext });

    expect(result.aiAvailable).toBe(true);
    expect(result.summary).toBe("Penjualan meningkat dibanding bulan lalu.");
    expect(result.metrics.topProductName).toBe("Kopi Susu");
  });

  it("does not send customer PII to the AI prompt", async () => {
    mockSalesQueries();
    vi.mocked(createJsonChatCompletion).mockResolvedValue(
      JSON.stringify({ summary: "Ringkasan toko." }),
    );

    await generateSalesInsightHandler({ data: {}, context: tenantContext });

    const [{ system, user }] = vi.mocked(createJsonChatCompletion).mock.calls[0];
    expect(system + user).not.toMatch(/email|whatsapp|alamat|nomor/i);
  });

  it("falls back to raw metrics without throwing when AI call fails", async () => {
    mockSalesQueries();
    vi.mocked(createJsonChatCompletion).mockRejectedValue(new Error("AI down"));

    const result = await generateSalesInsightHandler({ data: {}, context: tenantContext });

    expect(result.aiAvailable).toBe(false);
    expect(result.summary).toBeNull();
    expect(result.metrics.currentSalesTotal).toBe(100000);
  });

  it("falls back to raw metrics when rate limited", async () => {
    mockSalesQueries();
    vi.mocked(enforceAuthRateLimit).mockRejectedValue(
      new Error("Terlalu banyak percobaan. Silakan coba lagi nanti."),
    );

    const result = await generateSalesInsightHandler({ data: {}, context: tenantContext });

    expect(result.aiAvailable).toBe(false);
    expect(createJsonChatCompletion).not.toHaveBeenCalled();
  });

  it("caches AI summary per tenant/day-range and skips re-calling provider", async () => {
    mockSalesQueries();
    vi.mocked(createJsonChatCompletion).mockResolvedValue(
      JSON.stringify({ summary: "Cached summary." }),
    );

    await generateSalesInsightHandler({ data: { days: 30 }, context: tenantContext });
    const second = await generateSalesInsightHandler({
      data: { days: 30 },
      context: tenantContext,
    });

    expect(createJsonChatCompletion).toHaveBeenCalledTimes(1);
    expect(second.summary).toBe("Cached summary.");
  });

  it("bypasses cache and regenerates when regenerate flag is set", async () => {
    mockSalesQueries();
    vi.mocked(createJsonChatCompletion)
      .mockResolvedValueOnce(JSON.stringify({ summary: "Ringkasan pertama." }))
      .mockResolvedValueOnce(JSON.stringify({ summary: "Ringkasan kedua." }));

    await generateSalesInsightHandler({ data: { days: 30 }, context: tenantContext });
    const result = await generateSalesInsightHandler({
      data: { days: 30, regenerate: true },
      context: tenantContext,
    });

    expect(createJsonChatCompletion).toHaveBeenCalledTimes(2);
    expect(result.summary).toBe("Ringkasan kedua.");
  });
});
