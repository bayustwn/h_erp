-- CreateTable
CREATE TABLE "product_accounting_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "item_category_id" UUID,
    "item_id" UUID,
    "revenue_account_id" UUID,
    "cogs_account_id" UUID,
    "inventory_account_id" UUID,
    "purchase_account_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_accounting_mappings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_accounting_mappings_company_id_idx" ON "product_accounting_mappings"("company_id");
CREATE INDEX "product_accounting_mappings_item_category_id_idx" ON "product_accounting_mappings"("item_category_id");
CREATE INDEX "product_accounting_mappings_item_id_idx" ON "product_accounting_mappings"("item_id");
CREATE UNIQUE INDEX "product_accounting_mappings_company_id_item_category_id_key" ON "product_accounting_mappings"("company_id", "item_category_id");
CREATE UNIQUE INDEX "product_accounting_mappings_company_id_item_id_key" ON "product_accounting_mappings"("company_id", "item_id");

ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_item_category_id_fkey" FOREIGN KEY ("item_category_id") REFERENCES "item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_cogs_account_id_fkey" FOREIGN KEY ("cogs_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_inventory_account_id_fkey" FOREIGN KEY ("inventory_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_accounting_mappings" ADD CONSTRAINT "product_accounting_mappings_purchase_account_id_fkey" FOREIGN KEY ("purchase_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
