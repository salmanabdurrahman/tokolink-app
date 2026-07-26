import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPakasirPayUrl,
  cancelPakasirTransaction,
  createPakasirTransaction,
  getPakasirTransactionDetail,
} from "./pakasir";

const originalEnv = process.env;

describe("pakasir client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      PAKASIR_PROJECT_SLUG: "tokolink-test",
      PAKASIR_API_KEY: "secret-key",
      PAKASIR_BASE_URL: "https://app.pakasir.test",
    };
    global.fetch = vi.fn(async () =>
      Response.json({ payment: { order_id: "TL1", amount: 12000, payment_method: "qris" } }),
    ) as any;
  });

  it("builds pay URL with redirect", () => {
    expect(buildPakasirPayUrl("TL1", 12000, "https://tokolink.test/orders/TL1")).toBe(
      "https://app.pakasir.test/pay/tokolink-test/12000?order_id=TL1&redirect=https%3A%2F%2Ftokolink.test%2Forders%2FTL1",
    );
  });

  it("creates transaction using API key server-side", async () => {
    await expect(createPakasirTransaction("TL1", 12000)).resolves.toMatchObject({
      payment: { order_id: "TL1" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://app.pakasir.test/api/transactioncreate/qris",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          project: "tokolink-test",
          order_id: "TL1",
          amount: 12000,
          api_key: "secret-key",
        }),
      }),
    );
  });

  it("reads transaction detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ transaction: { order_id: "TL1", amount: 12000, status: "completed" } }),
    );

    await expect(getPakasirTransactionDetail("TL1", 12000)).resolves.toMatchObject({
      transaction: { status: "completed" },
    });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/api/transactiondetail");
  });

  it("cancels transaction", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ transaction: { order_id: "TL1", amount: 12000, status: "canceled" } }),
    );

    await expect(cancelPakasirTransaction("TL1", 12000)).resolves.toMatchObject({
      transaction: { status: "canceled" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://app.pakasir.test/api/transactioncancel",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects failed response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ message: "bad" }, { status: 500 }));

    await expect(createPakasirTransaction("TL1", 12000)).rejects.toThrow(
      "Layanan pembayaran sedang bermasalah. Coba lagi beberapa saat lagi.",
    );
  });

  it("times out slow requests without retrying mutation", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }) as any,
    );

    const request = expect(createPakasirTransaction("TL1", 12000)).rejects.toThrow(
      "Layanan pembayaran lambat merespons. Coba lagi beberapa saat lagi.",
    );
    await vi.advanceTimersByTimeAsync(10000);

    await request;
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
