import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TokolinkLogo } from "@/components/brand/logo";
import {
  LayoutDashboard,
  Link2,
  ShoppingBag,
  PackageCheck,
  WalletCards,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
} from "lucide-react";
import type { Tenant } from "@/lib/types";

interface TabItem {
  to: string;
  label: string;
  icon: React.ComponentType<any>;
  exact?: boolean;
}

const tabs: TabItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/links", label: "Tautan", icon: Link2 },
  { to: "/dashboard/products", label: "Produk", icon: ShoppingBag },
  { to: "/dashboard/orders", label: "Order", icon: PackageCheck },
  { to: "/dashboard/withdrawals", label: "Pencairan", icon: WalletCards },
  { to: "/dashboard/settings", label: "Pengaturan", icon: Settings },
];

interface DashboardSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  setIsMobileOpen: (open: boolean) => void;
  tenant: Tenant | null;
  pathname: string;
  signOut: () => Promise<void>;
  navigate: (opts: { to: any }) => void;
  orderCount?: number;
}

export function DashboardSidebar({
  isCollapsed,
  setIsCollapsed,
  isMobile,
  setIsMobileOpen,
  tenant,
  pathname,
  signOut,
  navigate,
  orderCount = 0,
}: DashboardSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border h-[65px] shrink-0">
        <div className="flex items-center gap-3">
          {!isCollapsed || isMobile ? (
            <TokolinkLogo size={24} showWordmark />
          ) : (
            <TokolinkLogo size={24} />
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup menu"
            className="p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition duration-200 select-none group ${
                active
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-muted/50 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="shrink-0"
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-accent" : "text-muted-foreground group-hover:text-foreground transition-colors"}`}
                />
              </motion.div>

              {(!isCollapsed || isMobile) && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap"
                >
                  <span>{t.label}</span>
                  {t.to === "/dashboard/orders" && orderCount > 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      {orderCount > 99 ? "99+" : orderCount}
                    </span>
                  )}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t border-border flex flex-col gap-1 shrink-0">
        {(!isCollapsed || isMobile) && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            Toko: <span className="font-semibold text-foreground">{tenant?.slug || ""}</span>
          </div>
        )}
        <Link
          to="/$slug"
          params={{ slug: tenant?.slug || "" }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition duration-200"
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          {(!isCollapsed || isMobile) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="whitespace-nowrap"
            >
              Lihat toko
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => {
            signOut().then(() => {
              navigate({ to: "/" });
            });
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition duration-200 w-full text-left cursor-pointer"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!isCollapsed || isMobile) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="whitespace-nowrap"
            >
              Keluar
            </motion.span>
          )}
        </button>
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Besarkan menu" : "Kecilkan menu"}
            className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition duration-200 w-full text-left mt-1 cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 shrink-0" />
            ) : (
              <ChevronLeft className="h-5 w-5 shrink-0" />
            )}
            {!isCollapsed && <span className="whitespace-nowrap">Kecilkan</span>}
          </button>
        )}
      </div>
    </div>
  );
}
