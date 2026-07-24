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
    nitro({ preset: "vercel" }),
  ],
});
