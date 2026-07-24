import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    order: { findUnique: vi.fn() },
  },
}));

vi.mock("./pakasir", () => ({
  getPakasirTransactionDetail: vi.fn(),
  isCompletedPakasirStatus: (status: string) => status.toLowerCase() === "completed",
}));

vi.mock("./order-helpers.server", () => ({
  markOrderPaid: vi.fn(),
  markOrderCanceled: vi.fn(),
}));

import { prisma } from "../db";
import { getPakasirTransactionDetail } from "./pakasir";
import { markOrderCanceled, markOrderPaid } from "./order-helpers.server";
import { handlePakasirWebhook } from "./pakasir-webhook";

const prismaAny = prisma as any;
const baseOrder = {
  id: "order-1",
  orderNumber: "TL1",
  total: 22000,
  payment: { id: "payment-1" },
};

describe("handlePakasirWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prismaAny.order.findUnique).mockResolvedValue(baseOrder);
    vi.mocked(getPakasirTransactionDetail).mockResolvedValue({
      transaction: {
        order_id: "TL1",
        amount: 22000,
        project: "tokolink",
        status: "completed",
        payment_method: "qris",
      },
    });
  });

  it("rejects invalid payload", async () => {
    await expect(handlePakasirWebhook({ order_id: "TL1" })).resolves.toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("rejects spoofed amount before detail check", async () => {
    await expect(handlePakasirWebhook({ order_id: "TL1", amount: 21000 })).resolves.toMatchObject({
      ok: false,
      error: "Order atau nominal tidak valid",
    });
    expect(getPakasirTransactionDetail).not.toHaveBeenCalled();
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("rejects detail mismatch", async () => {
    vi.mocked(getPakasirTransactionDetail).mockResolvedValueOnce({
      transaction: { order_id: "OTHER", amount: 22000, project: "tokolink", status: "completed" },
    });

    await expect(handlePakasirWebhook({ order_id: "TL1", amount: 22000 })).resolves.toMatchObject({
      ok: false,
      error: "Detail transaksi tidak cocok",
    });
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("marks completed webhook paid", async () => {
    await expect(handlePakasirWebhook({ order_id: "TL1", amount: 22000 })).resolves.toMatchObject({
      ok: true,
    });
    expect(markOrderPaid).toHaveBeenCalledWith(
      "TL1",
      expect.objectContaining({ detail: expect.objectContaining({ status: "completed" }) }),
      "qris",
    );
  });

  it("marks canceled webhook canceled", async () => {
    vi.mocked(getPakasirTransactionDetail).mockResolvedValueOnce({
      transaction: { order_id: "TL1", amount: 22000, project: "tokolink", status: "canceled" },
    });

    await expect(handlePakasirWebhook({ order_id: "TL1", amount: 22000 })).resolves.toMatchObject({
      ok: true,
    });
    expect(markOrderCanceled).toHaveBeenCalledWith(
      "TL1",
      expect.objectContaining({ detail: expect.objectContaining({ status: "canceled" }) }),
    );
  });
});
