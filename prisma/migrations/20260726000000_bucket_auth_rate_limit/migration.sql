-- Phase 37: switch auth_rate_limits from one-row-per-request to one row per
-- (event, scope_key, window_start) bucket, incremented atomically via
-- upsert. Existing rows use the old per-request shape and are no longer
-- useful once the app starts writing buckets, so they are cleared.
DELETE FROM "auth_rate_limits";

DROP INDEX IF EXISTS "auth_rate_limits_event_scope_key_created_at_idx";

ALTER TABLE "auth_rate_limits"
  ADD COLUMN "window_start" TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN "count" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "auth_rate_limits" ALTER COLUMN "window_start" DROP DEFAULT;
ALTER TABLE "auth_rate_limits" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE UNIQUE INDEX "auth_rate_limits_event_scope_key_window_start_key"
  ON "auth_rate_limits"("event", "scope_key", "window_start");
