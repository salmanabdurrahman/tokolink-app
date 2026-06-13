import { motion } from "framer-motion";

const fadeUp = {
  initial: { y: 24, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

export function FaqSection() {
  return (
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
              a: "Ya. Self-host atau pakai instance kami — keduanya gratis.",
            },
            {
              q: "Apakah saya butuh kartu kredit?",
              a: "Tidak. Sign-up cukup email — tanpa kartu, tanpa trial.",
            },
            {
              q: "Bagaimana dengan custom domain?",
              a: "Belum, Untuk sekarang kamu dapat slug tokolink.app/slug.",
            },
            {
              q: "Bisa dipakai untuk produk dengan banyak varian?",
              a: "Ya bisa",
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
  );
}
