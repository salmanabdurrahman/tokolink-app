import { motion } from "framer-motion";

export function TrustStrip() {
  return (
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
  );
}
