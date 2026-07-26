import { Label } from "@/components/ui/label";
import { formatIDR } from "@/lib/utils";
import { RajaOngkirLocationPicker } from "@/components/shipping/rajaongkir-location-picker";
import type { Destination, SelectedShipping, ShippingOption } from "@/hooks/use-shipping-quote";

interface ShippingPickerProps {
  selectedDestination: Destination | null;
  onDestinationChange: (destination: Destination | null) => void;
  loadingShipping: boolean;
  shippingOptions: ShippingOption[];
  shipping: SelectedShipping;
  onSelectShipping: (option: ShippingOption) => void;
}

export function ShippingPicker({
  selectedDestination,
  onDestinationChange,
  loadingShipping,
  shippingOptions,
  shipping,
  onSelectShipping,
}: ShippingPickerProps) {
  return (
    <div className="mt-4 space-y-3 shrink-0">
      <Label>Alamat tujuan pengiriman</Label>
      <RajaOngkirLocationPicker
        value={selectedDestination}
        onChange={onDestinationChange}
        quickSearchLabel="Cari kecamatan atau kelurahan tujuan"
        quickSearchPlaceholder="Cari kecamatan/kelurahan"
      />
      {loadingShipping && (
        <p className="text-xs text-muted-foreground">Sedang menghitung ongkir...</p>
      )}
      {shippingOptions.length > 0 && (
        <div className="grid gap-2">
          {shippingOptions.map((option) => (
            <button
              key={`${option.courier}-${option.service}-${option.cost}`}
              type="button"
              onClick={() => onSelectShipping(option)}
              className={`rounded-xl border p-3 text-left text-sm transition duration-200 ${shipping.courier === option.courier && shipping.service === option.service ? "border-foreground bg-surface" : "border-border hover:bg-surface"}`}
            >
              <span className="font-medium uppercase">
                {option.courier} {option.service}
              </span>
              <span className="ml-2 text-muted-foreground">{option.etd}</span>
              <span className="float-right font-medium">{formatIDR(option.cost)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
