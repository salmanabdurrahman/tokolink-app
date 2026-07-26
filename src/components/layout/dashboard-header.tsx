import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { TokolinkLogo } from "@/components/brand/logo";
import type { Tenant } from "@/lib/types";

interface DashboardHeaderProps {
  setIsMobileOpen: (open: boolean) => void;
  tenant: Tenant | null;
  orderCount?: number;
}

export function DashboardHeader({ setIsMobileOpen, tenant, orderCount = 0 }: DashboardHeaderProps) {
  return (
    <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label="Buka menu"
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-1.5">
          <TokolinkLogo size={20} showWordmark />
          <span className="font-display text-sm font-semibold text-muted-foreground">
            {tenant?.slug || ""}
          </span>
        </div>
        {orderCount > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            {orderCount > 99 ? "99+" : orderCount}
          </span>
        )}
      </div>
      <Link
        to="/$slug"
        params={{ slug: tenant?.slug || "" }}
        className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-surface transition"
      >
        Toko ↗
      </Link>
    </header>
  );
}
