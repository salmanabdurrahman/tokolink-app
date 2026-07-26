import { prisma } from "../src/db";

// Lightweight local load check for Phase 31: fire many concurrent queries
// through the shared Prisma singleton/pool and confirm the Supabase pooler
// does not reject with "too many connections" or similar pool exhaustion
// errors. Run with real local credentials:
//   bun scripts/db-pool-load-test.ts [concurrency]

function parseConcurrency(): number {
  const raw = process.argv[2];
  const parsed = raw ? Number(raw) : 50;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 50;
}

async function main() {
  const concurrency = parseConcurrency();
  console.log(`Firing ${concurrency} concurrent SELECT 1 queries...`);

  const start = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: concurrency }, () => prisma.$queryRaw`SELECT 1`),
  );
  const elapsedMs = Math.round(performance.now() - start);

  const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

  console.log(`Done in ${elapsedMs}ms. ${results.length - failures.length}/${results.length} ok.`);

  if (failures.length > 0) {
    console.error(`${failures.length} query(ies) failed:`);
    for (const failure of failures.slice(0, 5)) {
      console.error(`- ${String(failure.reason)}`);
    }
    process.exitCode = 1;
  } else {
    console.log("No connection errors under concurrent load.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Load test crashed:", error);
  process.exitCode = 1;
});
