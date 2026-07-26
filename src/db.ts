import prismaClientPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "./lib/logger.server";

const { PrismaClient } = prismaClientPkg;

// Serverless (Vercel) functions can reuse a warm instance across invocations,
// so keep the pool tiny to avoid overshooting Supabase's pooled connection
// limit when many instances run concurrently. DATABASE_URL must point at the
// Supabase transaction pooler (port 6543, `pgbouncer=true`); DIRECT_URL stays
// direct (port 5432) for Prisma CLI migrate/generate/seed only.
const DEFAULT_POOL_MAX = 3;
const poolMax = Number(process.env.DATABASE_POOL_MAX) || DEFAULT_POOL_MAX;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: poolMax,
});

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

declare global {
  var __prisma: PrismaClientInstance | undefined;
}

// Reuse the singleton across invocations in every environment (including
// production/serverless), not just dev, to avoid opening a fresh pool per
// invocation and exhausting Supabase's connection limit.
export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (!globalThis.__prisma) {
  globalThis.__prisma = prisma;
  logger.info("prisma.pool.init", { poolMax, nodeEnv: process.env.NODE_ENV });
}
