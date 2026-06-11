import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Masuk — Tokolink" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useAuth((s) => s.signIn);
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    signIn(email);
    navigate({ to: mode === "signup" ? "/onboarding" : "/dashboard" });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link to="/" className="font-display text-lg font-medium">
          tokolink<span className="text-background/40">/</span>
        </Link>
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-display text-5xl font-medium tracking-tight text-balance"
          >
            "Bikin toko itu <em className="font-light text-accent">harusnya</em> semudah upload foto
            IG."
          </motion.h2>
          <p className="mt-6 text-sm text-background/60">— Manifesto Tokolink</p>
        </div>
        <div className="text-xs text-background/40">MIT · Open Source · v1.0</div>
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="font-display mb-12 inline-block text-lg font-medium lg:hidden">
            tokolink<span className="text-foreground/40">/</span>
          </Link>

          <h1 className="font-display text-4xl font-medium tracking-tight">
            {mode === "signup" ? "Bikin akun." : "Selamat datang."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? "30 detik. Tanpa kartu kredit." : "Masuk untuk lanjutkan."}
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@umkm.com"
                className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              {mode === "signup" ? "Bikin akun" : "Masuk"} →
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "signup" ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-foreground underline underline-offset-4"
            >
              {mode === "signup" ? "Masuk" : "Daftar"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
