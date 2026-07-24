-- Add composite indexes used by production dashboard/storefront query paths.
-- Safe to run on existing databases; Prisma will track this migration after apply.

CREATE INDEX IF NOT EXISTS "media_tenant_id_url_idx" ON "media"("tenant_id", "url");

CREATE INDEX IF NOT EXISTS "product_variant_groups_product_id_sort_order_idx"
  ON "product_variant_groups"("product_id", "sort_order");

CREATE INDEX IF NOT EXISTS "product_variant_options_group_id_sort_order_idx"
  ON "product_variant_options"("group_id", "sort_order");

CREATE INDEX IF NOT EXISTS "ledger_entries_tenant_id_type_status_available_at_idx"
  ON "ledger_entries"("tenant_id", "type", "status", "available_at");
