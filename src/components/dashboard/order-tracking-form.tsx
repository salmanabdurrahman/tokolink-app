import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type OrderTrackingFormValue = {
  courier: string;
  trackingNumber: string;
};

interface OrderTrackingFormProps {
  value: OrderTrackingFormValue;
  canUpdateTracking: boolean;
  saving: boolean;
  onChange: (value: OrderTrackingFormValue) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function OrderTrackingForm({
  value,
  canUpdateTracking,
  saving,
  onChange,
  onSubmit,
}: OrderTrackingFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
      <Field label="Kurir">
        <Input
          value={value.courier}
          disabled={!canUpdateTracking}
          onChange={(event) => onChange({ ...value, courier: event.target.value })}
        />
      </Field>
      <Field label="Nomor resi">
        <Input
          value={value.trackingNumber}
          disabled={!canUpdateTracking}
          onChange={(event) => onChange({ ...value, trackingNumber: event.target.value })}
          placeholder="Masukkan resi setelah dikirim"
        />
      </Field>
      <Button
        type="submit"
        variant="outline"
        disabled={!canUpdateTracking || saving}
        className="self-end"
      >
        <PackageCheck className="h-4 w-4" />
        {saving ? "Menyimpan..." : "Simpan resi"}
      </Button>
    </form>
  );
}
