import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  RajaOngkirLocationPicker,
  type RajaOngkirLocationValue,
} from "@/components/shipping/rajaongkir-location-picker";

interface ShippingOriginPickerProps {
  originAddress: string;
  onOriginAddressChange: (value: string) => void;
  rajaOngkirOriginId: string;
  rajaOngkirOriginLabel: string;
  onOriginChange: (location: RajaOngkirLocationValue | null) => void;
}

export function ShippingOriginPicker({
  originAddress,
  onOriginAddressChange,
  rajaOngkirOriginId,
  rajaOngkirOriginLabel,
  onOriginChange,
}: ShippingOriginPickerProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-medium">Lokasi asal pengiriman</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lengkapi lokasi toko supaya Tokolink bisa menghitung ongkir otomatis lewat RajaOngkir saat
          pembeli checkout.
        </p>
      </div>
      {!originAddress && !rajaOngkirOriginId && (
        <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          Alamat dan lokasi asal belum lengkap. Checkout berbayar belum bisa menghitung ongkir
          sebelum ini diisi.
        </div>
      )}
      <Field label="Alamat lengkap toko">
        <Input
          value={originAddress}
          onChange={(e) => onOriginAddressChange(e.target.value)}
          placeholder="Contoh: Jl. Melati No. 1, dekat Pasar Karawang"
        />
      </Field>
      <Field label="Wilayah asal pengiriman">
        <RajaOngkirLocationPicker
          value={
            rajaOngkirOriginId
              ? {
                  id: rajaOngkirOriginId,
                  label: rajaOngkirOriginLabel,
                  provinceName: "",
                  cityName: "",
                  districtName: "",
                  subdistrictName: "",
                  zipCode: "",
                }
              : null
          }
          onChange={onOriginChange}
          quickSearchLabel="Cari kecamatan atau kelurahan toko"
          quickSearchPlaceholder="Ketik kecamatan/kelurahan toko"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Kurir aktif secara default: JNE, J&T, SiCepat, Anteraja, POS, TIKI, dan Ninja.
      </p>
    </div>
  );
}
