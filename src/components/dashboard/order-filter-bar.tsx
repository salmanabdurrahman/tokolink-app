import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

interface OrderFilterBarProps {
  statusFilter: string;
  paymentFilter: string;
  shippingFilter: string;
  onStatusChange: (value: string) => void;
  onPaymentChange: (value: string) => void;
  onShippingChange: (value: string) => void;
}

export function OrderFilterBar({
  statusFilter,
  paymentFilter,
  shippingFilter,
  onStatusChange,
  onPaymentChange,
  onShippingChange,
}: OrderFilterBarProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
      <Field label="Status order">
        <Select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="ALL">Semua status</option>
          <option value="PENDING_PAYMENT">Menunggu pembayaran</option>
          <option value="PAID">Sudah dibayar</option>
          <option value="SHIPPED">Dikirim</option>
          <option value="COMPLETED">Selesai</option>
          <option value="CANCELED">Dibatalkan</option>
        </Select>
      </Field>
      <Field label="Pembayaran">
        <Select value={paymentFilter} onChange={(event) => onPaymentChange(event.target.value)}>
          <option value="ALL">Semua pembayaran</option>
          <option value="PENDING">Menunggu</option>
          <option value="PAID">Lunas</option>
          <option value="FAILED">Gagal</option>
          <option value="EXPIRED">Kedaluwarsa</option>
          <option value="CANCELED">Dibatalkan</option>
        </Select>
      </Field>
      <Field label="Pengiriman">
        <Select value={shippingFilter} onChange={(event) => onShippingChange(event.target.value)}>
          <option value="ALL">Semua pengiriman</option>
          <option value="WITH_TRACKING">Sudah ada resi</option>
          <option value="WITHOUT_TRACKING">Belum ada resi</option>
        </Select>
      </Field>
    </div>
  );
}
