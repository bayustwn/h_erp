-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'SALES_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'PURCHASE_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'RETURN_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'RETURN_OUT';

-- CreateTable
CREATE TABLE "landed_costs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "purchase_order_id" UUID NOT NULL,
    "document_number" VARCHAR(50) NOT NULL,
    "cost_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "totalCost" DECIMAL(19,4) NOT NULL,
    "allocation_method" VARCHAR(20) NOT NULL DEFAULT 'BY_VALUE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "landed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landed_cost_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landed_cost_id" UUID NOT NULL,
    "purchase_order_item_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "landed_cost_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landed_costs_company_id_idx" ON "landed_costs"("company_id");

-- CreateIndex
CREATE INDEX "landed_costs_branch_id_idx" ON "landed_costs"("branch_id");

-- CreateIndex
CREATE INDEX "landed_costs_purchase_order_id_idx" ON "landed_costs"("purchase_order_id");

-- CreateIndex
CREATE INDEX "landed_costs_document_number_idx" ON "landed_costs"("document_number");

-- CreateIndex
CREATE INDEX "landed_costs_status_idx" ON "landed_costs"("status");

-- CreateIndex
CREATE INDEX "landed_cost_items_landed_cost_id_idx" ON "landed_cost_items"("landed_cost_id");

-- CreateIndex
CREATE INDEX "landed_cost_items_purchase_order_item_id_idx" ON "landed_cost_items"("purchase_order_item_id");

-- AddForeignKey
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_items" ADD CONSTRAINT "landed_cost_items_landed_cost_id_fkey" FOREIGN KEY ("landed_cost_id") REFERENCES "landed_costs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_items" ADD CONSTRAINT "landed_cost_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
