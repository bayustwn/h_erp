-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('STOCK', 'NON_STOCK', 'SERVICE');

-- CreateTable
CREATE TABLE "item_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "parent_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units_of_measure" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "symbol" VARCHAR(50) NOT NULL,
    "decimal_places" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "category_id" UUID,
    "base_unit_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "barcode" VARCHAR(100),
    "item_type" "InventoryItemType" NOT NULL DEFAULT 'STOCK',
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "is_sellable" BOOLEAN NOT NULL DEFAULT true,
    "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
    "min_stock" DECIMAL(19,4),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_unit_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "from_unit_id" UUID NOT NULL,
    "to_unit_id" UUID NOT NULL,
    "factor" DECIMAL(19,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "item_unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_categories_company_id_idx" ON "item_categories"("company_id");

-- CreateIndex
CREATE INDEX "item_categories_parent_id_idx" ON "item_categories"("parent_id");

-- CreateIndex
CREATE INDEX "item_categories_status_idx" ON "item_categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_company_id_code_key" ON "item_categories"("company_id", "code");

-- CreateIndex
CREATE INDEX "units_of_measure_company_id_idx" ON "units_of_measure"("company_id");

-- CreateIndex
CREATE INDEX "units_of_measure_status_idx" ON "units_of_measure"("status");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_company_id_code_key" ON "units_of_measure"("company_id", "code");

-- CreateIndex
CREATE INDEX "inventory_items_company_id_idx" ON "inventory_items"("company_id");

-- CreateIndex
CREATE INDEX "inventory_items_category_id_idx" ON "inventory_items"("category_id");

-- CreateIndex
CREATE INDEX "inventory_items_base_unit_id_idx" ON "inventory_items"("base_unit_id");

-- CreateIndex
CREATE INDEX "inventory_items_item_type_idx" ON "inventory_items"("item_type");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_company_id_sku_key" ON "inventory_items"("company_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_company_id_barcode_key" ON "inventory_items"("company_id", "barcode");

-- CreateIndex
CREATE INDEX "item_unit_conversions_item_id_idx" ON "item_unit_conversions"("item_id");

-- CreateIndex
CREATE INDEX "item_unit_conversions_from_unit_id_idx" ON "item_unit_conversions"("from_unit_id");

-- CreateIndex
CREATE INDEX "item_unit_conversions_to_unit_id_idx" ON "item_unit_conversions"("to_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_unit_conversions_item_id_from_unit_id_to_unit_id_key" ON "item_unit_conversions"("item_id", "from_unit_id", "to_unit_id");

-- AddForeignKey
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_unit_conversions" ADD CONSTRAINT "item_unit_conversions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_unit_conversions" ADD CONSTRAINT "item_unit_conversions_from_unit_id_fkey" FOREIGN KEY ("from_unit_id") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_unit_conversions" ADD CONSTRAINT "item_unit_conversions_to_unit_id_fkey" FOREIGN KEY ("to_unit_id") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
