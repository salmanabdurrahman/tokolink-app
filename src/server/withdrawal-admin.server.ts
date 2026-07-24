import { prisma } from "../db";
import { sendWithdrawalStatusEmail } from "./email";

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
