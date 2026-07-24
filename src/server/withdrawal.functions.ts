import { Prisma } from "@prisma/client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { sendWithdrawalRequestEmail, sendWithdrawalStatusEmail } from "./email";

export const PLATFORM_FEE_RATE = 0.015;
export const WITHDRAWAL_HOLD_DAYS = 2;
export const MIN_WITHDRAWAL_AMOUNT = 50_000;

export const requestWithdrawalSchema = z.object({
  amount: z.number().int().min(MIN_WITHDRAWAL_AMOUNT, "Minimum pencairan Rp50.000"),
});

function getNow() {
  return new Date();
}

async function calculateAvailableBalance(tx: typeof prisma, tenantId: string, now = getNow()) {
  const [availableLedger, pendingWithdrawal] = await Promise.all([
    tx.ledgerEntry.aggregate({
      where: {
        tenantId,
        availableAt: { lte: now },
        type: { in: ["CREDIT", "FEE", "ADJUSTMENT"] },
        status: { in: ["PENDING", "AVAILABLE"] },
        OR: [{ orderId: null }, { order: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } } }],
      },
      _sum: { amount: true },
    }),
    tx.ledgerEntry.aggregate({
      where: {
        tenantId,
        type: "WITHDRAWAL",
        status: { in: ["PENDING", "AVAILABLE", "SETTLED"] },
        withdrawalRequest: { status: { in: ["REQUESTED", "PROCESSING", "PAID"] } },
      },
      _sum: { amount: true },
    }),
  ]);

  return (availableLedger._sum.amount || 0) + (pendingWithdrawal._sum.amount || 0);
}

export const getTenantWithdrawalSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    const now = getNow();
    const [availableBalance, pendingBalance, withdrawals] = await Promise.all([
      calculateAvailableBalance(prisma, tenantId, now),
      prisma.ledgerEntry
        .aggregate({
          where: {
            tenantId,
            availableAt: { gt: now },
            type: { in: ["CREDIT", "FEE"] },
            status: { in: ["PENDING", "AVAILABLE"] },
            order: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
          },
          _sum: { amount: true },
        })
        .then((result) => result._sum.amount || 0),
      prisma.withdrawalRequest.findMany({
        where: { tenantId },
        orderBy: { requestedAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      availableBalance,
      pendingBalance,
      minimumWithdrawal: MIN_WITHDRAWAL_AMOUNT,
      feeRate: PLATFORM_FEE_RATE,
      holdDays: WITHDRAWAL_HOLD_DAYS,
      withdrawals,
    };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(requestWithdrawalSchema)
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Toko tidak ditemukan untuk pengguna ini");

    const withdrawal = await prisma.$transaction(
      async (tx) => {
        const availableBalance = await calculateAvailableBalance(tx as typeof prisma, tenantId);
        if (availableBalance < MIN_WITHDRAWAL_AMOUNT) {
          throw new Error("Saldo tersedia belum mencapai minimum pencairan Rp50.000");
        }
        if (data.amount > availableBalance) {
          throw new Error("Nominal pencairan melebihi saldo tersedia");
        }

        const request = await tx.withdrawalRequest.create({
          data: { tenantId, amount: data.amount, status: "REQUESTED" },
          include: { tenant: { include: { user: true } } },
        });
        await tx.ledgerEntry.create({
          data: {
            tenantId,
            withdrawalRequestId: request.id,
            type: "WITHDRAWAL",
            amount: -data.amount,
            availableAt: new Date(),
            status: "PENDING",
            note: `Withdrawal request ${request.id}`,
          },
        });
        return request;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (withdrawal.tenant.user.email) {
      await sendWithdrawalRequestEmail(withdrawal.tenant.user.email, withdrawal.amount).catch(
        (error) => console.error("[WITHDRAWAL] Failed to send request email", error),
      );
    }

    return withdrawal;
  });

export async function updateWithdrawalStatus(
  withdrawalId: string,
  status: "PROCESSING" | "PAID" | "REJECTED",
  note = "",
) {
  const withdrawal = await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { tenant: { include: { user: true } } },
    });
    if (!request) throw new Error("Request pencairan tidak ditemukan");

    const updated = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status,
        note,
        processedAt: status === "PROCESSING" ? null : new Date(),
      },
      include: { tenant: { include: { user: true } } },
    });

    if (status === "PAID") {
      await tx.ledgerEntry.updateMany({
        where: { withdrawalRequestId: withdrawalId, type: "WITHDRAWAL" },
        data: { status: "SETTLED" },
      });
    }
    if (status === "REJECTED") {
      await tx.ledgerEntry.updateMany({
        where: { withdrawalRequestId: withdrawalId, type: "WITHDRAWAL" },
        data: { status: "CANCELED" },
      });
    }

    return updated;
  });

  if (withdrawal.tenant.user.email) {
    await sendWithdrawalStatusEmail(
      withdrawal.tenant.user.email,
      withdrawal.amount,
      withdrawal.status,
    ).catch((error) => console.error("[WITHDRAWAL] Failed to send status email", error));
  }

  return withdrawal;
}
