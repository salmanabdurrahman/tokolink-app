import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/motion/fade-up";

const MotionLink = motion(Link);

export function CtaBanner() {
  return (
    <section className="relative px-6 pb-32 overflow-hidden">
      <FadeUp className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground p-10 sm:p-20">
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
          <h2 className="font-display max-w-3xl text-5xl font-medium tracking-tight text-background sm:text-6xl text-balance">
            Selesai baca? Bikin toko-mu sekarang.
          </h2>
          <MotionLink
            to="/auth"
            whileTap={{ scale: 0.97 }}
            whileHover="hover"
            className={cn("group mt-10", buttonVariants("accent", "lg"))}
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
      </FadeUp>
    </section>
  );
}
