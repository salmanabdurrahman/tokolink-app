import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

const MotionLink = motion(Link);

const fadeUp = {
  initial: { y: 24, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

export function CtaBanner() {
  return (
    <section className="relative px-6 pb-32 overflow-hidden">
      <motion.div
        {...fadeUp}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground p-10 sm:p-20"
      >
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
  );
}
