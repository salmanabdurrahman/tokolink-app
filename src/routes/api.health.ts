import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "../db";
import { logger } from "../lib/logger.server";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OTP_HASH_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "TURNSTILE_SECRET_KEY",
  "PAKASIR_PROJECT_SLUG",
  "PAKASIR_API_KEY",
  "RAJAONGKIR_API_KEY",
  "RESEND_API_KEY",
  "RESEND_SENDER_EMAIL",
] as const;

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
        let db = "ok";
        let dbLatencyMs: number | null = null;

        const dbStart = performance.now();
        try {
          await prisma.$queryRaw`SELECT 1`;
          dbLatencyMs = Math.round(performance.now() - dbStart);
        } catch (error) {
          db = "error";
          logger.error("health.db.check_failed", { error });
        }

        const ok = db === "ok" && missingEnv.length === 0;

        return Response.json(
          {
            ok,
            checks: {
              db,
              dbLatencyMs,
              env: missingEnv.length === 0 ? "ok" : "missing",
              storage:
                process.env.R2_BUCKET && process.env.R2_PUBLIC_BASE_URL ? "configured" : "missing",
            },
            missingEnv,
          },
          {
            status: ok ? 200 : 503,
            headers: { "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});
