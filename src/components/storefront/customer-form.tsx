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
  errors?: Record<string, string>;
}

export function CustomerForm({ value, onChange, errors = {} }: CustomerFormProps) {
  return (
    <div className="mt-4 grid gap-3 shrink-0">
      <Label>Data pembeli</Label>
      <div>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Nama lengkap"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>
      <div>
        <Input
          value={value.whatsapp}
          onChange={(e) => onChange({ ...value, whatsapp: formatWhatsAppNumber(e.target.value) })}
          placeholder="WhatsApp, contoh 628123456789"
        />
        {errors.whatsapp && <p className="mt-1 text-xs text-destructive">{errors.whatsapp}</p>}
      </div>
      <div>
        <Input
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="Email receipt (opsional)"
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>
      <div>
        <Textarea
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Alamat pengiriman"
          rows={2}
        />
        {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
      </div>
    </div>
  );
}
