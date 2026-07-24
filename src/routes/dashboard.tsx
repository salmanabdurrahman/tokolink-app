import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, useTenant } from "@/lib/store";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
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
  head: () => ({
    meta: [
      { title: "Dashboard — Tokolink" },
      { property: "og:title", content: "Dashboard — Tokolink" },
      { property: "og:description", content: "Kelola toko online UMKM Anda." },
      { property: "og:image", content: "https://tokolink-v2.vercel.app/og-auth.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://tokolink-v2.vercel.app/og-auth.png" },
    ],
    links: [{ rel: "canonical", href: "https://tokolink-v2.vercel.app/dashboard" }],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { tenant: loadedTenant } = Route.useLoaderData();
  const { isLoading: authLoading, user } = useAuthGuard({ requireTenant: true });
  const signOut = useAuth((s) => s.signOut);
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (loadedTenant) {
      setTenant(loadedTenant as any);
    }
  }, [loadedTenant, setTenant]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm font-medium text-muted-foreground animate-pulse font-medium">
          Memuat...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card text-card-foreground shrink-0 overflow-hidden"
      >
        <DashboardSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobile={false}
          setIsMobileOpen={setIsMobileOpen}
          tenant={tenant}
          pathname={location.pathname}
          signOut={signOut}
          navigate={navigate}
        />
      </motion.aside>
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64 border-r border-border bg-card text-card-foreground md:hidden shadow-2xl"
            >
              <DashboardSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={true}
                setIsMobileOpen={setIsMobileOpen}
                tenant={tenant}
                pathname={location.pathname}
                signOut={signOut}
                navigate={navigate}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader setIsMobileOpen={setIsMobileOpen} tenant={tenant} />
        <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
