ALTER TABLE "document_sequences" ADD COLUMN "last_period" VARCHAR(50);

CREATE UNIQUE INDEX "document_sequences_company_scope_unique_idx"
ON "document_sequences"("company_id", "document_type", "period_format")
WHERE "branch_id" IS NULL;

CREATE UNIQUE INDEX "document_sequences_branch_scope_unique_idx"
ON "document_sequences"("company_id", "branch_id", "document_type", "period_format")
WHERE "branch_id" IS NOT NULL;
