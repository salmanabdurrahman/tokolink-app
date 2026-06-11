import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTenant } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Tokolink" }] }),
  component: Onboarding,
});

function Onboarding() {
  const setTenant = useTenant((s) => s.setTenant);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const navigate = useNavigate();

  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanSlug || !name) return;
    setTenant({ slug: cleanSlug, name, tagline });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Langkah 1 dari 1
        </span>
        <h1 className="font-display mt-3 text-5xl font-medium tracking-tight text-balance">
          Klaim slug toko-mu.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Ini akan jadi URL publik toko kamu. Bisa diubah nanti.
        </p>

        <form onSubmit={submit} className="mt-12 space-y-8">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              URL Toko
            </label>
            <div className="mt-2 flex items-center border-b border-border focus-within:border-foreground">
              <span className="font-display text-lg text-muted-foreground">tokolink.app/</span>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="nama-toko-kamu"
                className="font-display flex-1 bg-transparent py-3 text-lg focus:outline-none"
              />
            </div>
            {cleanSlug && (
              <p className="mt-2 text-xs text-muted-foreground">
                URL kamu: <span className="text-foreground">tokolink.app/{cleanSlug}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Nama Toko
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kopi Senja"
              className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Tagline (opsional)
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Specialty coffee dari Bandung"
              className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base focus:border-foreground focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            Lanjut ke dashboard →
          </button>
        </form>
      </motion.div>
    </div>
  );
}
