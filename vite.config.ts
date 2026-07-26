import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("react") || id.includes("scheduler")) return "react";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "src/server.ts",
      },
    }),
    viteReact(),
    nitro({
      preset: "vercel",
      // Checkout/shipping routes call external providers (RajaOngkir + Pakasir)
      // sequentially; raise the per-route budget above Vercel's low default so a
      // slow upstream can't trip the function timeout mid-payment.
      vercel: {
        functionRules: {
          "/api/checkout": { maxDuration: 30 },
          "/api/shipping/**": { maxDuration: 30 },
        },
      },
    }),
  ],
});
