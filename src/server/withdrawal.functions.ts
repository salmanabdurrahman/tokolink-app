import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { sendWithdrawalRequestEmail } from "./email";
import { recordMetric } from "../lib/metrics.server";
import { requireTenant } from "./tenant-context.server";

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
    const tenantId = requireTenant(context);

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
    const tenantId = requireTenant(context);

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
      { isolationLevel: "Serializable" },
    );

    if (withdrawal.tenant.user.email) {
      await sendWithdrawalRequestEmail(withdrawal.tenant.user.email, withdrawal.amount).catch(
        (error) => console.error("[WITHDRAWAL] Failed to send request email", error),
      );
    }

    recordMetric("withdrawal_request", { tenantId });
    return withdrawal;
  });
