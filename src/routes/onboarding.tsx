import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store";
import { createTenant } from "@/server/tenant.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Onboarding — Tokolink" }],
    links: [{ rel: "canonical", href: "https://tokolink.app/onboarding" }],
  }),
  component: Onboarding,
});

function Onboarding() {
  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.isLoading);
  const setUser = useAuth((s) => s.setUser);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Guard: Redirect if not logged in, or if already has a tenant
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({ to: "/auth" });
      } else if (user.tenant) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, authLoading, navigate]);

  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanSlug || !name) return;

    setLoading(true);
    setError("");

    try {
      const { getRecaptchaToken } = await import("@/lib/recaptcha");
      const recaptchaToken = await getRecaptchaToken("onboarding");

      const tenant = await createTenant({
        slug: cleanSlug,
        name,
        tagline,
        recaptchaToken,
      });

      // Update the user profile in store with the new tenant info
      setUser({
        ...user,
        tenant,
      });

      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Gagal membuat toko. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat...</p>
      </div>
    );
  }

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

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={submit} className="mt-12 space-y-8">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              URL Toko
            </label>
            <div className="mt-2 flex items-center border-b border-border focus-within:border-foreground">
              <span className="font-display text-lg text-muted-foreground">tokolink.app/</span>
              <input
                required
                disabled={loading}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="nama-toko-kamu"
                className="font-display flex-1 bg-transparent py-3 text-lg focus:outline-none disabled:opacity-50"
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
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kopi Senja"
              className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base focus:border-foreground focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Tagline (opsional)
            </label>
            <input
              disabled={loading}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Specialty coffee dari Bandung"
              className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base focus:border-foreground focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50 cursor-pointer select-none"
          >
            {loading ? "Membuat toko..." : "Lanjut ke dashboard →"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
