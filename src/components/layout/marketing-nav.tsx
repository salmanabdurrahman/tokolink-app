import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { TokolinkLogo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Fitur" },
  { href: "#usecases", label: "Use cases" },
  { href: "#how", label: "Cara kerja" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className={cn("hidden md:inline-flex", buttonVariants("default", "sm"))}>
            Mulai gratis
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} className="max-w-sm">
        <nav className="flex flex-col gap-1 text-base">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3 py-3 font-medium text-foreground hover:bg-surface transition"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          to="/auth"
          onClick={() => setMobileOpen(false)}
          className={cn("mt-4 w-full justify-center", buttonVariants("default", "md"))}
        >
          Mulai gratis
        </Link>
      </Sheet>
    </motion.header>
  );
}
