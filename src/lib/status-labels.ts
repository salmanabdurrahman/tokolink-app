export const orderStatusLabels = {
  PENDING_PAYMENT: "Menunggu pembayaran",
  PAID: "Dibayar",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELED: "Dibatalkan",
  REFUNDED: "Refund",
  DISPUTED: "Dispute",
} as const;

export const paymentStatusLabels = {
  PENDING: "Menunggu",
  PAID: "Dibayar",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  CANCELED: "Dibatalkan",
} as const;

export const withdrawalStatusLabels = {
  REQUESTED: "Diminta",
  PROCESSING: "Diproses",
  PAID: "Dibayar",
  REJECTED: "Ditolak",
} as const;
