-- Product stock/inventory tracking (optional, opt-in per product).
ALTER TABLE "products" ADD COLUMN "stock" INTEGER;
ALTER TABLE "products" ADD COLUMN "track_stock" BOOLEAN NOT NULL DEFAULT false;

-- Product category grouping.
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_categories_tenant_id_sort_order_idx" ON "product_categories"("tenant_id", "sort_order");

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD COLUMN "category_id" UUID;

CREATE INDEX "products_category_id_idx" ON "products"("category_id");

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
