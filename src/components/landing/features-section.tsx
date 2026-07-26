import { motion } from "framer-motion";
import { FadeUp } from "@/components/motion/fade-up";

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_100%)] opacity-25 pointer-events-none -z-10" />
      <div className="mx-auto max-w-6xl">
        <FadeUp className="max-w-2xl">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            01 — Fitur
          </span>
          <h2 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl text-balance">
            Tiga hal yang <em className="font-light">benar-benar</em> dipakai UMKM.
          </h2>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              no: "/01",
              title: "All-in-One Link",
              copy: "Satu URL untuk Instagram, TikTok, Maps, menu PDF — dan toko kamu. Goodbye linktr.ee.",
            },
            {
              no: "/02",
              title: "Micro-Catalog",
              copy: "Etalase produk 2-kolom dengan varian (ukuran/warna) dan harga adjustment otomatis.",
            },
            {
              no: "/03",
              title: "Magic WA Checkout",
              copy: "Keranjang otomatis jadi pesan terstruktur ke WhatsApp. Tanpa payment gateway ribet.",
            },
          ].map((f, i) => (
            <FadeUp
              key={f.no}
              delay={i * 0.1}
              whileHover="hover"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition hover:border-foreground/30 hover:shadow-lg cursor-pointer"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-sm text-muted-foreground">{f.no}</span>
                <motion.span
                  variants={{
                    rest: { x: 0, y: 0 },
                    hover: { x: 2, y: -2 },
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="text-muted-foreground group-hover:text-foreground"
                >
                  ↗
                </motion.span>
              </div>
              <h3 className="font-display mt-12 text-2xl font-medium tracking-tight">{f.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{f.copy}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
