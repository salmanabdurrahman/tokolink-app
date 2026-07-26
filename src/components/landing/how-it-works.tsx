import { getPublicHostname } from "@/lib/site-url";
import { FadeUp } from "@/components/motion/fade-up";

export function HowItWorks() {
  const publicHostname = getPublicHostname();

  return (
    <section id="how" className="px-6 py-32 relative overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeUp className="max-w-2xl">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            03 — Cara kerja
          </span>
          <h2 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl text-balance">
            Tiga langkah. <em className="font-light">Tidak lebih.</em>
          </h2>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Daftar & klaim slug",
              copy: `${publicHostname}/nama-toko-kamu. Gratis, 30 detik.`,
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
            <FadeUp key={s.step} delay={i * 0.1}>
              <div className="flex items-center gap-3">
                <span className="font-display text-6xl font-light tracking-tighter text-foreground/20">
                  {s.step}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h3 className="font-display mt-6 text-2xl font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.copy}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
