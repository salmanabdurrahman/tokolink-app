-- Prevent duplicate order ledger entries from duplicate payment webhooks.
-- Keep the oldest row when legacy duplicate rows already exist.
WITH ranked_ledger_entries AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "order_id", "type"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS row_number
  FROM "ledger_entries"
  WHERE "order_id" IS NOT NULL
)
DELETE FROM "ledger_entries"
WHERE "id" IN (
  SELECT "id" FROM ranked_ledger_entries WHERE row_number > 1
);

CREATE UNIQUE INDEX "ledger_entries_order_id_type_key" ON "ledger_entries"("order_id", "type");
