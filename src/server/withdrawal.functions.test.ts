import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    ledgerEntry: {
      aggregate: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    withdrawalRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        ledgerEntry: {
          aggregate: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
        },
        withdrawalRequest: {
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      }),
    ),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));
vi.mock("./email", () => ({
  sendWithdrawalRequestEmail: vi.fn(async () => undefined),
  sendWithdrawalStatusEmail: vi.fn(async () => undefined),
}));

import { prisma } from "../db";
import { sendWithdrawalRequestEmail, sendWithdrawalStatusEmail } from "./email";
import { updateWithdrawalStatus } from "./withdrawal-admin.server";
import {
  getTenantWithdrawalSummary,
  requestWithdrawal,
  requestWithdrawalSchema,
} from "./withdrawal.functions";

const prismaAny = prisma as any;
const tenantContext = { tenant: { id: "tenant-1" } };
const requestWithdrawalHandler = requestWithdrawal as any;
const getTenantWithdrawalSummaryHandler = getTenantWithdrawalSummary as any;

function sum(amount: number | null) {
  return { _sum: { amount } };
}

describe("withdrawal functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates available balance from eligible ledger minus active withdrawals", async () => {
    vi.mocked(prismaAny.ledgerEntry.aggregate)
      .mockResolvedValueOnce(sum(148_500))
      .mockResolvedValueOnce(sum(-50_000))
      .mockResolvedValueOnce(sum(20_000));
    vi.mocked(prismaAny.withdrawalRequest.findMany).mockResolvedValue([{ id: "wd-1" }]);

    await expect(getTenantWithdrawalSummaryHandler({ context: tenantContext })).resolves.toEqual({
      availableBalance: 98_500,
      pendingBalance: 20_000,
      minimumWithdrawal: 50_000,
      feeRate: 0.015,
      holdDays: 2,
      withdrawals: [{ id: "wd-1" }],
    });

    expect(prisma.ledgerEntry.aggregate).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: "tenant-1",
        availableAt: { lte: expect.any(Date) },
        type: { in: ["CREDIT", "FEE", "ADJUSTMENT"] },
      }),
      _sum: { amount: true },
    });
    expect(prisma.ledgerEntry.aggregate).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: "tenant-1",
        type: "WITHDRAWAL",
        status: { in: ["PENDING", "AVAILABLE", "SETTLED"] },
        withdrawalRequest: { status: { in: ["REQUESTED", "PROCESSING", "PAID"] } },
      }),
      _sum: { amount: true },
    });
  });

  it("rejects request below minimum amount", () => {
    expect(() => requestWithdrawalSchema.parse({ amount: 49_000 })).toThrow(
      "Minimum pencairan Rp50.000",
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects request when available balance is lower than minimum", async () => {
    const tx = {
      ledgerEntry: {
        aggregate: vi.fn().mockResolvedValueOnce(sum(40_000)).mockResolvedValueOnce(sum(0)),
        create: vi.fn(),
      },
      withdrawalRequest: { create: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      requestWithdrawalHandler({ data: { amount: 50_000 }, context: tenantContext }),
    ).rejects.toThrow("Saldo tersedia belum mencapai minimum pencairan Rp50.000");

    expect(tx.withdrawalRequest.create).not.toHaveBeenCalled();
  });

  it("creates withdrawal request and pending ledger entry atomically", async () => {
    const request = {
      id: "wd-1",
      amount: 60_000,
      status: "REQUESTED",
      tenant: { user: { email: "seller@example.com" } },
    };
    const tx = {
      ledgerEntry: {
        aggregate: vi.fn().mockResolvedValueOnce(sum(100_000)).mockResolvedValueOnce(sum(0)),
        create: vi.fn(),
      },
      withdrawalRequest: { create: vi.fn().mockResolvedValue(request) },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      requestWithdrawalHandler({ data: { amount: 60_000 }, context: tenantContext }),
    ).resolves.toMatchObject({ id: "wd-1" });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(tx.withdrawalRequest.create).toHaveBeenCalledWith({
      data: { tenantId: "tenant-1", amount: 60_000, status: "REQUESTED" },
      include: { tenant: { include: { user: true } } },
    });
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        withdrawalRequestId: "wd-1",
        type: "WITHDRAWAL",
        amount: -60_000,
        status: "PENDING",
      }),
    });
    expect(sendWithdrawalRequestEmail).toHaveBeenCalledWith("seller@example.com", 60_000);
  });

  it("settles ledger when withdrawal status becomes paid", async () => {
    const updated = {
      id: "wd-1",
      amount: 60_000,
      status: "PAID",
      tenant: { user: { email: "seller@example.com" } },
    };
    const tx = {
      withdrawalRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "wd-1", status: "PROCESSING" }),
        update: vi.fn().mockResolvedValue(updated),
      },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-1", "PAID")).resolves.toMatchObject({ status: "PAID" });

    expect(tx.ledgerEntry.updateMany).toHaveBeenCalledWith({
      where: { withdrawalRequestId: "wd-1", type: "WITHDRAWAL" },
      data: { status: "SETTLED" },
    });
    expect(sendWithdrawalStatusEmail).toHaveBeenCalledWith("seller@example.com", 60_000, "PAID");
  });

  it("cancels ledger and clears processedAt when withdrawal status becomes processing", async () => {
    const updated = {
      id: "wd-1",
      amount: 60_000,
      status: "PROCESSING",
      tenant: { user: { email: "seller@example.com" } },
    };
    const updateSpy = vi.fn().mockResolvedValue(updated);
    const tx = {
      withdrawalRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "wd-1", status: "REQUESTED" }),
        update: updateSpy,
      },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-1", "PROCESSING")).resolves.toMatchObject({
      status: "PROCESSING",
    });

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ processedAt: null }) }),
    );
    expect(tx.ledgerEntry.updateMany).not.toHaveBeenCalled();
  });

  it("cancels ledger when withdrawal status becomes rejected", async () => {
    const updated = {
      id: "wd-1",
      amount: 60_000,
      status: "REJECTED",
      tenant: { user: { email: "seller@example.com" } },
    };
    const tx = {
      withdrawalRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "wd-1", status: "PROCESSING" }),
        update: vi.fn().mockResolvedValue(updated),
      },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-1", "REJECTED")).resolves.toMatchObject({
      status: "REJECTED",
    });

    expect(tx.ledgerEntry.updateMany).toHaveBeenCalledWith({
      where: { withdrawalRequestId: "wd-1", type: "WITHDRAWAL" },
      data: { status: "CANCELED" },
    });
  });

  it("rejects an invalid status transition out of a terminal PAID request", async () => {
    const tx = {
      withdrawalRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "wd-1", status: "PAID" }),
        update: vi.fn(),
      },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-1", "REJECTED")).rejects.toThrow(
      "Transisi status pencairan tidak valid",
    );

    expect(tx.withdrawalRequest.update).not.toHaveBeenCalled();
    expect(tx.ledgerEntry.updateMany).not.toHaveBeenCalled();
  });

  it("throws when withdrawal request does not exist", async () => {
    const tx = {
      withdrawalRequest: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-missing", "PAID")).rejects.toThrow(
      "Request pencairan tidak ditemukan",
    );

    expect(tx.withdrawalRequest.update).not.toHaveBeenCalled();
  });

  it("skips status email when tenant owner has no email", async () => {
    const updated = {
      id: "wd-1",
      amount: 60_000,
      status: "PAID",
      tenant: { user: { email: null } },
    };
    const tx = {
      withdrawalRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "wd-1", status: "PROCESSING" }),
        update: vi.fn().mockResolvedValue(updated),
      },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-1", "PAID")).resolves.toMatchObject({ status: "PAID" });

    expect(sendWithdrawalStatusEmail).not.toHaveBeenCalled();
  });

  it("logs error when status email fails to send", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(sendWithdrawalStatusEmail).mockRejectedValueOnce(new Error("smtp down"));
    const updated = {
      id: "wd-1",
      amount: 60_000,
      status: "PAID",
      tenant: { user: { email: "seller@example.com" } },
    };
    const tx = {
      withdrawalRequest: {
        findUnique: vi.fn().mockResolvedValue({ id: "wd-1", status: "PROCESSING" }),
        update: vi.fn().mockResolvedValue(updated),
      },
      ledgerEntry: { updateMany: vi.fn() },
    };
    vi.mocked(prismaAny.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(updateWithdrawalStatus("wd-1", "PAID")).resolves.toMatchObject({ status: "PAID" });

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[WITHDRAWAL] Failed to send status email",
        expect.any(Error),
      );
    });
    consoleSpy.mockRestore();
  });
});
