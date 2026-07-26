import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTenant } from "@/lib/store";
import { useLoadedTenant } from "@/hooks/use-loaded-tenant";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { PageHeader } from "@/components/layout/page-header";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { updateTenantSchema } from "@/lib/schemas";
import { formatWhatsAppNumber } from "@/lib/utils";
import {
  RajaOngkirLocationPicker,
  type RajaOngkirLocationValue,
} from "@/components/shipping/rajaongkir-location-picker";
import { getMyTenantSettings } from "@/server/tenant.functions";
import { isExpectedLoaderError, logLoaderError } from "@/lib/loader-error";

export const Route = createFileRoute("/dashboard/settings")({
  staleTime: 15_000,
  loader: async () => {
    try {
      return { tenant: await getMyTenantSettings({}), loaderError: false };
    } catch (error) {
      logLoaderError("dashboard.settings", error);
      return { tenant: null, loaderError: !isExpectedLoaderError(error) };
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { tenant: loadedTenant, loaderError } = Route.useLoaderData();
  const tenant = useLoadedTenant(loadedTenant);
  const updateSettings = useTenant((s) => s.updateSettings);

  const [name, setName] = useState(tenant?.name ?? "");
  const [tagline, setTagline] = useState(tenant?.tagline ?? "");
  const [whatsapp, setWhatsapp] = useState(tenant?.whatsapp ?? "");
  const [avatar, setAvatar] = useState(tenant?.avatar ?? "");
  const [whatsappTemplate, setWhatsappTemplate] = useState(tenant?.whatsappTemplate ?? "");
  const [originAddress, setOriginAddress] = useState(tenant?.originAddress ?? "");
  const [rajaOngkirOriginId, setRajaOngkirOriginId] = useState(tenant?.rajaOngkirOriginId ?? "");
  const [rajaOngkirOriginLabel, setRajaOngkirOriginLabel] = useState(
    tenant?.rajaOngkirOriginLabel ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setTagline(tenant.tagline);
      setWhatsapp(tenant.whatsapp);
      setAvatar(tenant.avatar);
      setWhatsappTemplate(tenant.whatsappTemplate ?? "");
      setOriginAddress(tenant.originAddress ?? "");
      setRajaOngkirOriginId(tenant.rajaOngkirOriginId ?? "");
      setRajaOngkirOriginLabel(tenant.rajaOngkirOriginLabel ?? "");
    }
  }, [tenant]);

  const isDirty = Boolean(
    tenant &&
    (name !== tenant.name ||
      tagline !== tenant.tagline ||
      whatsapp !== tenant.whatsapp ||
      avatar !== tenant.avatar ||
      whatsappTemplate !== (tenant.whatsappTemplate ?? "") ||
      originAddress !== (tenant.originAddress ?? "") ||
      rajaOngkirOriginId !== (tenant.rajaOngkirOriginId ?? "") ||
      rajaOngkirOriginLabel !== (tenant.rajaOngkirOriginLabel ?? "")),
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleOriginChange = (location: RajaOngkirLocationValue | null) => {
    setRajaOngkirOriginId(location?.id ?? "");
    setRajaOngkirOriginLabel(location?.label ?? "");
  };

  if (!tenant) {
    if (loaderError) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Gagal memuat pengaturan toko. Periksa koneksi Anda dan coba muat ulang halaman.
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10 bg-background text-foreground">
      <PageHeader
        label="Pengaturan"
        title="Identitas toko"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.assign(`/${tenant.slug}`)}
          >
            Lihat toko
          </Button>
        }
      />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = {
            name,
            tagline,
            whatsapp: formatWhatsAppNumber(whatsapp),
            avatar,
            whatsappTemplate,
            originAddress,
            rajaOngkirOriginId,
            rajaOngkirOriginLabel,
          };
          const parsed = updateTenantSchema.safeParse(data);
          if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
              nextErrors[issue.path.join(".") || "form"] = issue.message;
            });
            setErrors(nextErrors);
            return;
          }
          setSaving(true);
          setErrors({});
          try {
            await updateSettings(parsed.data);
            setWhatsapp(parsed.data.whatsapp ?? whatsapp);
            toast.success("Pengaturan toko berhasil disimpan");
          } catch (err: any) {
            toast.error(err.message || "Gagal menyimpan pengaturan");
          } finally {
            setSaving(false);
          }
        }}
        className="space-y-6"
      >
        <Field label="Nama toko">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </Field>
        <Field label="Tagline">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          {errors.tagline && <p className="mt-1 text-xs text-destructive">{errors.tagline}</p>}
        </Field>
        <Field label="Nomor WhatsApp">
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsAppNumber(e.target.value))}
            placeholder="6281234567890"
            required
          />
          {errors.whatsapp && <p className="mt-1 text-xs text-destructive">{errors.whatsapp}</p>}
        </Field>
        <Field label="Avatar / Logo Toko">
          <ImageUpload value={avatar} onChange={(url) => setAvatar(url)} />
        </Field>
        <Field label="Template pesan WhatsApp">
          <Textarea
            value={whatsappTemplate}
            onChange={(e) => setWhatsappTemplate(e.target.value)}
            placeholder="Kosongkan untuk memakai template standar Tokolink."
            rows={3}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Template tampil sebagai pembuka pesan, daftar item dan total tetap otomatis.
          </p>
          {errors.whatsappTemplate && (
            <p className="mt-1 text-xs text-destructive">{errors.whatsappTemplate}</p>
          )}
        </Field>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-medium">Lokasi asal pengiriman</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lengkapi lokasi toko supaya Tokolink bisa menghitung ongkir otomatis lewat RajaOngkir
              saat pembeli checkout.
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
              onChange={(e) => setOriginAddress(e.target.value)}
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
              onChange={handleOriginChange}
              quickSearchLabel="Cari kecamatan atau kelurahan toko"
              quickSearchPlaceholder="Ketik kecamatan/kelurahan toko"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Kurir aktif secara default: JNE, J&T, SiCepat, Anteraja, POS, TIKI, dan Ninja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !isDirty}>
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
          {isDirty && (
            <span className="text-xs text-muted-foreground">Ada perubahan belum disimpan</span>
          )}
        </div>
      </form>
    </div>
  );
}
