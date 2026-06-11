import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function MarketingNav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-4 rounded-full border border-border/80 bg-background/70 px-3 py-2 pl-5 backdrop-blur-xl">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight">
          tokolink<span className="text-foreground/40">/</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <a href="#features" className="hover:text-foreground transition">
            Fitur
          </a>
          <a href="#usecases" className="hover:text-foreground transition">
            Use cases
          </a>
          <a href="#how" className="hover:text-foreground transition">
            Cara kerja
          </a>
          <a href="#faq" className="hover:text-foreground transition">
            FAQ
          </a>
        </nav>
        <Link
          to="/auth"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/90"
        >
          Mulai gratis
        </Link>
      </div>
    </motion.header>
  );
}
