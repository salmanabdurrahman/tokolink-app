import { getPublicHostname } from "@/lib/site-url";
import { FadeUp } from "@/components/motion/fade-up";

export function FaqSection() {
  const publicHostname = getPublicHostname();

  return (
    <section id="faq" className="border-t border-border px-6 py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-[1fr_2fr]">
        <FadeUp>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">04 — FAQ</span>
          <h2 className="font-display mt-3 text-5xl font-medium tracking-tight text-balance sm:text-6xl">
            Hal yang sering ditanya.
          </h2>
        </FadeUp>
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
              a: `Belum. Untuk sekarang kamu dapat slug ${publicHostname}/slug.`,
            },
            {
              q: "Bisa dipakai untuk produk dengan banyak varian?",
              a: "Ya. Tiap produk bisa punya beberapa tipe varian (ukuran, warna, dll.) dengan penyesuaian harga otomatis.",
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
