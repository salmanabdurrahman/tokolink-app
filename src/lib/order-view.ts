import { formatDateTimeIndonesia } from "@/lib/formatters";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/status-labels";

export function statusLabel(status: string) {
  return orderStatusLabels[status as keyof typeof orderStatusLabels] || status;
}

export function paymentLabel(status = "") {
  return paymentStatusLabels[status as keyof typeof paymentStatusLabels] || status || "-";
}

export function formatOrderDate(value?: string | Date | null) {
  if (!value) return "-";
  return formatDateTimeIndonesia(value);
}

export function getWithdrawalEligibleDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  date.setDate(date.getDate() + 2);
  return formatOrderDate(date);
}
