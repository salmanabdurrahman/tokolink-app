import { formatCurrencyCompact } from "./formatters";
import type { CartItem } from "./types";

export function buildWhatsAppUrl(
  phone: string,
  storeName: string,
  items: CartItem[],
  total: number,
  note?: string,
  template?: string,
) {
  const defaultIntro = `Halo *${storeName}*, saya mau order pesanan berikut ya:\n`;
  const lines = [
    template?.trim() || defaultIntro,
    ...items.map((i) => {
      const priceFormatted = formatCurrencyCompact(i.unitPrice * i.qty);
      const variantText = i.variantName ? ` (${i.variantName})` : "";
      return `▪ ${i.qty}x ${i.productName}${variantText}\n  ${priceFormatted}`;
    }),
    "",
    note ? `*Catatan:*\n${note}\n` : "",
    `*Total Pesanan: ${formatCurrencyCompact(total)}*\n`,
    template?.trim() ? "" : `Mohon info instruksi pembayarannya ya. Terima kasih! 🙏`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
