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

// Order matches the merchant funnel: visit -> klik produk -> checkout mulai
// -> pembayaran selesai -> klik WhatsApp.
export const analyticsFunnelLabels = {
  storefront_view: "Kunjungan toko",
  product_click: "Klik produk",
  checkout_started: "Checkout dimulai",
  payment_completed: "Pembayaran selesai",
  whatsapp_click: "Klik WhatsApp",
} as const;
