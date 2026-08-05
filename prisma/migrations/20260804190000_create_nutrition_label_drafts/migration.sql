CREATE TYPE "NutritionLabelDraftStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED');

CREATE TABLE "nutrition_label_drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "confirmed_by_id" UUID,
  "confirmed_food_id" UUID,
  "document_hash" CHAR(64) NOT NULL,
  "status" "NutritionLabelDraftStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "name" VARCHAR(150),
  "brand" VARCHAR(150),
  "package_quantity" DECIMAL(18,6),
  "package_unit" "ReferenceUnit",
  "extracted_data" JSONB NOT NULL,
  "warnings" JSONB NOT NULL,
  "missing_fields" JSONB NOT NULL,
  "raw_text" TEXT NOT NULL,
  "confidence" DECIMAL(5,4),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "nutrition_label_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nutrition_label_drafts_household_id_document_hash_key" ON "nutrition_label_drafts"("household_id", "document_hash");
CREATE UNIQUE INDEX "nutrition_label_drafts_confirmed_food_id_key" ON "nutrition_label_drafts"("confirmed_food_id");
CREATE INDEX "nutrition_label_drafts_household_id_status_expires_at_idx" ON "nutrition_label_drafts"("household_id", "status", "expires_at");
CREATE INDEX "nutrition_label_drafts_created_by_id_idx" ON "nutrition_label_drafts"("created_by_id");
CREATE INDEX "nutrition_label_drafts_confirmed_by_id_idx" ON "nutrition_label_drafts"("confirmed_by_id");

ALTER TABLE "nutrition_label_drafts" ADD CONSTRAINT "nutrition_label_drafts_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nutrition_label_drafts" ADD CONSTRAINT "nutrition_label_drafts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nutrition_label_drafts" ADD CONSTRAINT "nutrition_label_drafts_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nutrition_label_drafts" ADD CONSTRAINT "nutrition_label_drafts_confirmed_food_id_fkey" FOREIGN KEY ("confirmed_food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
