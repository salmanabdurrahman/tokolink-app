import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, useTenant } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Link2,
  ShoppingBag,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Store,
} from "lucide-react";

import { getMyTenant } from "@/server/tenant.functions";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    try {
      const tenant = await getMyTenant({});
      return { tenant };
    } catch {
      return { tenant: null };
    }
  },
  head: () => ({ meta: [{ title: "Dashboard — Tokolink" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { tenant: loadedTenant } = Route.useLoaderData();
  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.isLoading);
  const signOut = useAuth((s) => s.signOut);
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({ to: "/auth" });
      } else if (!user.tenant) {
        navigate({ to: "/onboarding" });
      }
    }
  }, [user, authLoading, navigate]);

  // Sync loader data to Zustand store
  useEffect(() => {
    if (loadedTenant) {
      setTenant(loadedTenant);
    }
  }, [loadedTenant, setTenant]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm font-medium text-muted-foreground animate-pulse font-medium">Memuat...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/dashboard/links", label: "Tautan", icon: Link2 },
    { to: "/dashboard/products", label: "Produk", icon: ShoppingBag },
    { to: "/dashboard/settings", label: "Pengaturan", icon: Settings },
  ] as const;

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border h-[65px] shrink-0">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 shrink-0 text-foreground" />
          {(!isCollapsed || isMobile) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display font-medium text-base tracking-tight"
            >
              tokolink<span className="text-foreground/40">/</span>
            </motion.span>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
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
              {/* Shared layout active background pill */}
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
                  className="whitespace-nowrap"
                >
                  {t.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="mt-auto p-3 border-t border-border flex flex-col gap-1 shrink-0">
        {/* Store Slug Info */}
        {(!isCollapsed || isMobile) && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            Toko: <span className="font-semibold text-foreground">{tenant?.slug || ""}</span>
          </div>
        )}

        {/* View Store */}
        <Link
          to="/$slug"
          params={{ slug: tenant?.slug || "" }}
          target="_blank"
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

        {/* Logout */}
        <button
          onClick={() => {
            signOut();
            navigate({ to: "/" });
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition duration-200 w-full text-left"
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

        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition duration-200 w-full text-left mt-1"
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
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* 1. Desktop Sticky Sidebar (Hidden on mobile) */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card text-card-foreground shrink-0 overflow-hidden"
      >
        {sidebarContent(false)}
      </motion.aside>

      {/* 2. Mobile Drawer Sidebar (Slide-in, hidden on desktop) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
            />

            {/* Mobile Sidebar Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64 border-r border-border bg-card text-card-foreground md:hidden shadow-2xl"
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. Main Dashboard Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header (Hidden on desktop) */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-display font-medium text-base tracking-tight">
              tokolink<span className="text-muted-foreground">/</span>
              {tenant?.slug || ""}
            </span>
          </div>
          <Link
            to="/$slug"
            params={{ slug: tenant?.slug || "" }}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-surface transition"
          >
            Toko ↗
          </Link>
        </header>

        {/* Dashboard Pages Main Section */}
        <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
