import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { PageHeader } from "@/components/layout/page-header";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateTenantSchema } from "@/lib/schemas";
import { formatWhatsAppNumber } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const tenant = useTenant((s) => s.tenant);
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
  const [originQuery, setOriginQuery] = useState(tenant?.rajaOngkirOriginLabel ?? "");
  const [originOptions, setOriginOptions] = useState<
    { id: string; label: string; provinceName: string; cityName: string; districtName: string }[]
  >([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
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
      setOriginQuery(tenant.rajaOngkirOriginLabel ?? "");
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

  const searchOrigin = async () => {
    try {
      setSearchingOrigin(true);
      const { searchRajaOngkirDestinations } = await import("@/server/shipping.functions");
      const result = await searchRajaOngkirDestinations({
        data: { search: originQuery, limit: 5 },
      });
      setOriginOptions(result);
      if (!result.length) toast.error("Origin tidak ditemukan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencari origin");
    } finally {
      setSearchingOrigin(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-10 bg-background text-foreground">
      <PageHeader
        label="Pengaturan"
        title="Identitas toko"
        action={
          tenant ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign(`/${tenant.slug}`)}
            >
              Preview storefront
            </Button>
          ) : null
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
            <h2 className="font-display text-lg font-medium">Origin pengiriman</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Wajib diisi sebelum checkout berbayar bisa menghitung ongkir RajaOngkir.
            </p>
          </div>
          {!originAddress && !rajaOngkirOriginId && (
            <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              Lengkapi alamat dan origin agar checkout berbayar bisa menghitung ongkir.
            </div>
          )}
          <Field label="Alamat origin">
            <Input
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              placeholder="Alamat pickup/toko"
            />
          </Field>
          <Field label="Cari origin RajaOngkir">
            <div className="flex gap-2">
              <Input
                value={originQuery}
                onChange={(e) => setOriginQuery(e.target.value)}
                placeholder="Ketik kecamatan/kelurahan origin"
              />
              <Button
                type="button"
                variant="outline"
                disabled={searchingOrigin}
                onClick={searchOrigin}
              >
                {searchingOrigin ? "Cari..." : "Cari"}
              </Button>
            </div>
          </Field>
          {originOptions.length > 0 && (
            <div className="grid gap-2">
              {originOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setRajaOngkirOriginId(option.id);
                    setRajaOngkirOriginLabel(option.label);
                    setOriginQuery(option.label);
                    setOriginOptions([]);
                  }}
                  className="rounded-xl border border-border p-3 text-left text-sm hover:bg-surface transition"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {rajaOngkirOriginId && (
            <div className="rounded-xl bg-surface p-3 text-sm">
              <div className="text-xs text-muted-foreground">Origin dipilih</div>
              <div className="mt-1 font-medium">{rajaOngkirOriginLabel}</div>
              <div className="mt-1 text-xs text-muted-foreground">ID: {rajaOngkirOriginId}</div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Kurir default aktif: JNE, J&T, SiCepat, Anteraja, POS, TIKI, Ninja.
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
