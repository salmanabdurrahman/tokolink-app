import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useCallback, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { buttonVariants } from "@/components/ui/button";
const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((mod) => ({ default: mod.Analytics })),
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-medium text-foreground">404</h1>
        <h2 className="mt-4 font-display text-xl font-medium text-foreground">
          Halaman tidak ditemukan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6">
          <Link to="/" className={buttonVariants("default", "md")}>
            Ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-medium tracking-tight text-foreground">
          Halaman ini gagal dimuat
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ada yang salah di sisi kami. Coba muat ulang atau kembali ke beranda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={buttonVariants("default", "md")}
          >
            Coba lagi
          </button>
          <a href="/" className={buttonVariants("outline", "md")}>
            Ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tokolink - Buat Toko Online WhatsApp UMKM" },
      {
        name: "description",
        content:
          "Buat link toko online WhatsApp Anda sendiri dalam hitungan detik. Kelola produk, varian, dan terima pesanan teratur via chat WhatsApp.",
      },
      { name: "author", content: "Tokolink" },
      { property: "og:title", content: "Tokolink - Buat Toko Online WhatsApp UMKM" },
      {
        property: "og:description",
        content:
          "Buat link toko online WhatsApp Anda sendiri dalam hitungan detik. Kelola produk, varian, dan terima pesanan teratur via chat WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#0A0A0A" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.json" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}

import { useSession } from "../hooks/use-session";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const invalidateAfterSessionSync = useCallback(() => router.invalidate(), [router]);
  useSession({ onSessionSynced: invalidateAfterSessionSync });

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
