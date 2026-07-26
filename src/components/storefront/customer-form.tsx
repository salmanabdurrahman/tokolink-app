import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatWhatsAppNumber } from "@/lib/utils";

export type CustomerFormValue = {
  name: string;
  email: string;
  whatsapp: string;
  address: string;
};

interface CustomerFormProps {
  value: CustomerFormValue;
  onChange: (value: CustomerFormValue) => void;
}

export function CustomerForm({ value, onChange }: CustomerFormProps) {
  return (
    <div className="mt-4 grid gap-3 shrink-0">
      <Label>Data pembeli</Label>
      <Input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="Nama lengkap"
      />
      <Input
        value={value.whatsapp}
        onChange={(e) => onChange({ ...value, whatsapp: formatWhatsAppNumber(e.target.value) })}
        placeholder="WhatsApp, contoh 628123456789"
      />
      <Input
        value={value.email}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
        placeholder="Email receipt (opsional)"
      />
      <Textarea
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        placeholder="Alamat pengiriman"
        rows={2}
      />
    </div>
  );
}
