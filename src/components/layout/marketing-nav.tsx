import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TokolinkLogo } from "@/components/brand/logo";

export function MarketingNav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-4 rounded-full border border-border/80 bg-background/70 px-3 py-2 pl-5 backdrop-blur-xl">
        <Link to="/" aria-label="Tokolink — Kembali ke beranda" className="flex items-center">
          <TokolinkLogo size={28} showWordmark />
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
