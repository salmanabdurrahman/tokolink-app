import { prisma } from "../src/db";
import { cleanupExpiredAuthData } from "../src/server/data-retention.server";

// Retention sweep: delete expired auth-rate-limit buckets, stale audit logs,
// expired verification codes, old canceled orders, and stale AnalyticsDaily
// rows so these tables stay small and their lookup queries stay fast. Run
// manually or on a schedule (cron/CI job):
//   bun scripts/cleanup-auth-data.ts

async function main() {
  const result = await cleanupExpiredAuthData(prisma);
  console.log(JSON.stringify({ deleted: result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
