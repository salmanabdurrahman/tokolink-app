import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);

  const [name, setName] = useState(tenant.name);
  const [tagline, setTagline] = useState(tenant.tagline);
  const [whatsapp, setWhatsapp] = useState(tenant.whatsapp);
  const [avatar, setAvatar] = useState(tenant.avatar);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Pengaturan</span>
        <h1 className="font-display mt-2 text-4xl font-medium tracking-tight">Identitas toko</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTenant({ name, tagline, whatsapp, avatar });
          toast.success("Pengaturan toko berhasil disimpan");
        }}
        className="space-y-6"
      >
        <Field label="Nama toko">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Tagline">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="input" />
        </Field>
        <Field label="Nomor WhatsApp (628...)">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            placeholder="6281234567890"
            className="input"
          />
        </Field>
        <Field label="Avatar / Logo Toko">
          <ImageUpload value={avatar} onChange={(url) => setAvatar(url)} />
        </Field>

        <div className="flex items-center gap-3">
          <button className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition">
            Simpan perubahan
          </button>
        </div>
      </form>

      <style>{`
        .input { width: 100%; border-radius: 10px; border: 1px solid var(--border); background: var(--background); padding: 12px 14px; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--foreground); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
