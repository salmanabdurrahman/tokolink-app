import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MarketingNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CoffeeIcon, ShirtIcon, PackageIcon, JasaIcon } from "@/components/animated-usecase-icons";

const MotionLink = motion(Link);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tokolink — Storefront instan untuk UMKM" },
      {
        name: "description",
        content:
          "Bikin landing-page toko + katalog produk dengan checkout WhatsApp dalam 5 menit. Gratis & open-source.",
      },
      { property: "og:title", content: "Tokolink — Storefront instan untuk UMKM" },
      {
        property: "og:description",
        content: "Link-in-bio + micro-catalog + WhatsApp checkout. Open source.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tokolink.app" },
      { property: "og:image", content: "https://tokolink.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Tokolink — Storefront instan untuk UMKM" },
      {
        name: "twitter:description",
        content: "Bikin landing-page toko + katalog produk dengan checkout WhatsApp dalam 5 menit.",
      },
    ],
    links: [{ rel: "canonical", href: "https://tokolink.app" }],
  }),
  component: Landing,
});

const fadeUp = {
  initial: { y: 24, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Tokolink",
          description:
            "Storefront instan untuk UMKM dengan integrasi link-in-bio dan checkout WhatsApp.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "All",
          url: "https://tokolink.app",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "IDR",
          },
        })}
      </script>
      <MarketingNav />

      {/* Hero */}
      <section className="relative px-6 pt-40 pb-24 sm:pt-48 sm:pb-32 overflow-hidden">
        {/* Background Grid Pattern with Radial Fade */}
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] opacity-40 pointer-events-none -z-10" />

        {/* Glowing Abstract Blurs */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.15, 0.95, 1],
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 0.9, 1.1, 1],
              x: [0, -30, 50, 0],
              y: [0, 40, -10, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/3 -right-1/4 h-[600px] w-[600px] rounded-full bg-muted/30 blur-[150px]"
          />
        </div>

        {/* Abstract Concentric Circles Vector Ornament */}
        <motion.div
          initial={{ opacity: 0, rotate: -10 }}
          animate={{ opacity: 0.15, rotate: 10 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
          className="absolute right-12 top-24 hidden lg:block text-foreground pointer-events-none -z-10"
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          >
            <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="35" />
            <circle cx="50" cy="50" r="25" strokeDasharray="4 2" />
            <circle cx="50" cy="50" r="15" />
            <path d="M50 0v100M0 50h100" strokeDasharray="1 1" />
          </svg>
        </motion.div>

        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            v1.0 — Open Source · MIT
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="font-display mt-6 text-[clamp(3rem,8vw,7rem)] font-medium leading-[0.95] tracking-tight text-balance"
          >
            Toko online <span className="italic font-light text-foreground/60">kamu,</span>
            <br />
            siap dalam 5 menit.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-8 max-w-xl text-lg text-muted-foreground text-pretty"
          >
            Satu halaman. Semua link, semua produk, satu tombol checkout langsung ke WhatsApp.
            Gratis & open-source untuk semua UMKM.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <MotionLink
              to="/auth"
              whileTap={{ scale: 0.97 }}
              whileHover="hover"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              Klaim slug kamu
              <motion.span
                variants={{
                  rest: { rotate: 0 },
                  hover: { rotate: 45 },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="grid h-6 w-6 place-items-center rounded-full bg-accent text-foreground font-semibold"
              >
                ↗
              </motion.span>
            </MotionLink>
            <MotionLink
              to="/$slug"
              params={{ slug: "kopi-senja" }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full border border-border px-6 py-3.5 text-sm font-medium hover:bg-surface transition"
            >
              Lihat demo storefront
            </MotionLink>
          </motion.div>
        </div>
      </section>

      {/* Trust strip with infinite marquee */}
      <section className="border-y border-border bg-surface overflow-hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-12 px-6 py-6 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="shrink-0 z-10 bg-surface pr-4">Dipakai oleh</span>
          <div className="relative w-full overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                ease: "linear",
                duration: 20,
                repeat: Infinity,
              }}
              className="flex gap-16 whitespace-nowrap"
            >
              {[
                "KOPI SENJA",
                "BATIK NUSWANTARA",
                "RESELLER HUB",
                "JASA DESAIN",
                "TOKO MAMA",
                "GADO-GADO MPOK",
                "KOPI SENJA",
                "BATIK NUSWANTARA",
                "RESELLER HUB",
                "JASA DESAIN",
                "TOKO MAMA",
                "GADO-GADO MPOK",
              ].map((n, i) => (
                <span key={i} className="shrink-0 font-display text-foreground/70 tracking-widest">
                  {n}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_100%)] opacity-25 pointer-events-none -z-10" />
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              01 — Fitur
            </span>
            <h2 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl text-balance">
              Tiga hal yang <em className="font-light">benar-benar</em> dipakai UMKM.
            </h2>
          </motion.div>

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
              <motion.div
                key={f.no}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
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
                <h3 className="font-display mt-12 text-2xl font-medium tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">{f.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section
        id="usecases"
        className="border-t border-border bg-surface px-6 py-32 relative overflow-hidden"
      >
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="flex items-end justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                02 — Use cases
              </span>
              <h2 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl">
                Cocok untuk siapa saja.
              </h2>
            </div>
          </motion.div>

          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
            {[
              { tag: "F&B", desc: "Coffee shop, katering, bakery", icon: <CoffeeIcon /> },
              { tag: "Fashion", desc: "Thrift, batik, custom merch", icon: <ShirtIcon /> },
              { tag: "Reseller", desc: "Dropship, agen, pre-order", icon: <PackageIcon /> },
              { tag: "Jasa", desc: "Desain, fotografi, edit video", icon: <JasaIcon /> },
            ].map((u, i) => (
              <motion.div
                key={u.tag}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover="hover"
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group flex flex-col aspect-square bg-background p-6 transition duration-300 hover:bg-accent cursor-pointer"
              >
                <div className="h-12 w-12 flex items-center justify-center bg-muted/40 rounded-2xl group-hover:bg-background/25 transition-colors duration-300">
                  {u.icon}
                </div>
                <div className="font-display mt-auto pt-12 text-2xl font-medium">{u.tag}</div>
                <div className="mt-1 text-xs text-muted-foreground group-hover:text-foreground/70">
                  {u.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-32 relative overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              03 — Cara kerja
            </span>
            <h2 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl text-balance">
              Tiga langkah. <em className="font-light">Tidak lebih.</em>
            </h2>
          </motion.div>

          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Daftar & klaim slug",
                copy: "tokolink.app/nama-toko-kamu. Gratis, 30 detik.",
              },
              {
                step: "02",
                title: "Unggah produk & link",
                copy: "Tambahkan katalog, varian, dan media sosial dari dashboard.",
              },
              {
                step: "03",
                title: "Bagikan & terima pesanan",
                copy: "Sebar link di bio, terima pesanan WhatsApp otomatis.",
              },
            ].map((s, i) => (
              <motion.div key={s.step} {...fadeUp} transition={{ duration: 0.7, delay: i * 0.1 }}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-6xl font-light tracking-tighter text-foreground/20">
                    {s.step}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h3 className="font-display mt-6 text-2xl font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative px-6 pb-32 overflow-hidden">
        <motion.div
          {...fadeUp}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground p-10 sm:p-20"
        >
          {/* Ambient animated glow blob */}
          <motion.div
            animate={{
              scale: [1, 1.2, 0.9, 1],
              opacity: [0.8, 0.95, 0.75, 0.8],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent blur-[80px] pointer-events-none"
          />
          <div className="relative z-10">
            <h2 className="font-display max-w-3xl text-4xl font-medium tracking-tight text-background sm:text-6xl text-balance">
              Selesai baca? Bikin toko-mu sekarang.
            </h2>
            <MotionLink
              to="/auth"
              whileTap={{ scale: 0.97 }}
              whileHover="hover"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-foreground transition"
            >
              Mulai gratis — tanpa kartu kredit
              <motion.span
                variants={{
                  rest: { x: 0 },
                  hover: { x: 4 },
                }}
                transition={{ type: "spring", stiffness: 450, damping: 12 }}
              >
                →
              </motion.span>
            </MotionLink>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border px-6 py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-[1fr_2fr]">
          <motion.div {...fadeUp}>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              04 — FAQ
            </span>
            <h2 className="font-display mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
              Hal yang sering ditanya.
            </h2>
          </motion.div>
          <div className="divide-y divide-border border-y border-border">
            {[
              {
                q: "Gratis selamanya?",
                a: "Ya. Tokolink open-source (MIT). Self-host atau pakai instance kami — keduanya gratis.",
              },
              {
                q: "Apakah saya butuh kartu kredit?",
                a: "Tidak. Sign-up cukup email — tanpa kartu, tanpa trial.",
              },
              {
                q: "Bagaimana dengan custom domain?",
                a: "Belum di MVP. Untuk sekarang kamu dapat subdomain tokolink.app/slug.",
              },
              {
                q: "Bisa dipakai untuk produk dengan banyak varian?",
                a: "Satu tipe varian per produk (mis. Ukuran ATAU Warna) — sengaja kami batasi untuk UX yang clean di mobile.",
              },
              {
                q: "Pembayaran?",
                a: "Saat ini, checkout langsung diarahkan ke WhatsApp untuk konfirmasi manual. Integrasi payment gateway sedang dipertimbangkan.",
              },
            ].map((f) => (
              <details key={f.q} className="group py-6">
                <summary className="font-display flex cursor-pointer items-center justify-between text-lg font-medium tracking-tight list-none">
                  {f.q}
                  <span className="text-2xl text-muted-foreground transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
