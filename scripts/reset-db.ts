import { prisma } from "../src/db";

// Hard reset: empties ALL application data while keeping the schema and
// Prisma migration history intact. Every table in the `public` schema is
// TRUNCATEd (except `_prisma_migrations`) with RESTART IDENTITY CASCADE, so
// the database ends up truly empty — zero rows.
//
// DESTRUCTIVE & IRREVERSIBLE. Intended for local/dev/demo databases only.
//
// Usage:
//   bun scripts/reset-db.ts --yes
//   RESET_DB_CONFIRM=1 bun scripts/reset-db.ts
//
// Without the confirmation flag it prints what it would do and exits.

const PRESERVE = new Set(["_prisma_migrations"]);

async function main() {
  const confirmed =
    process.argv.includes("--yes") ||
    process.argv.includes("-y") ||
    process.env.RESET_DB_CONFIRM === "1";

  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const tables = rows
    .map((r) => r.tablename)
    .filter((t) => !PRESERVE.has(t))
    .sort();

  if (tables.length === 0) {
    console.log("No tables to truncate.");
    return;
  }

  if (!confirmed) {
    console.log("DRY RUN — this will DELETE ALL DATA from these tables:");
    for (const t of tables) console.log(`   • ${t}`);
    console.log("\nRe-run with `--yes` to actually wipe the data:");
    console.log("   bun scripts/reset-db.ts --yes");
    return;
  }

  const identifiers = tables.map((t) => `"public"."${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`);

  console.log(`Truncated ${tables.length} tables. Database is now empty.`);
  for (const t of tables) console.log(`   • ${t}`);
}

main()
  .catch((error) => {
    console.error("Reset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
