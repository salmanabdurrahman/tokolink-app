import { prisma } from "../db";
import { sendWithdrawalStatusEmail } from "./email";

type WithdrawalTargetStatus = "PROCESSING" | "PAID" | "REJECTED";

// Allowed source statuses per target. PAID and REJECTED are terminal: nothing
// may transition out of them. This blocks the double-payout path where a
// settled (PAID) request is flipped to REJECTED, which would CANCEL its
// WITHDRAWAL ledger hold and release already-paid funds back into the tenant's
// available balance. Serializable isolation closes the concurrent-transition
// race so two admins can't both settle the same request.
const ALLOWED_SOURCE_STATUSES: Record<WithdrawalTargetStatus, string[]> = {
  PROCESSING: ["REQUESTED"],
  PAID: ["REQUESTED", "PROCESSING"],
  REJECTED: ["REQUESTED", "PROCESSING"],
};

export async function updateWithdrawalStatus(
  withdrawalId: string,
  status: WithdrawalTargetStatus,
  note = "",
) {
  const withdrawal = await prisma.$transaction(
    async (tx) => {
      const request = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        include: { tenant: { include: { user: true } } },
      });
      if (!request) throw new Error("Request pencairan tidak ditemukan");

      if (!ALLOWED_SOURCE_STATUSES[status].includes(request.status)) {
        throw new Error(
          `Transisi status pencairan tidak valid: ${request.status} \u2192 ${status}`,
        );
      }

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
    },
    { isolationLevel: "Serializable" },
  );

  if (withdrawal.tenant.user.email) {
    await sendWithdrawalStatusEmail(
      withdrawal.tenant.user.email,
      withdrawal.amount,
      withdrawal.status,
    ).catch((error) => console.error("[WITHDRAWAL] Failed to send status email", error));
  }

  return withdrawal;
}
