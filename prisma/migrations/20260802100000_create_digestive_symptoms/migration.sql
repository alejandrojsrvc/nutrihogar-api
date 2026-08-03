CREATE TYPE "DigestiveSymptomType" AS ENUM ('GAS', 'BLOATING', 'ABDOMINAL_PAIN', 'HEARTBURN', 'NAUSEA', 'DIARRHEA', 'CONSTIPATION', 'OTHER');
CREATE TYPE "DigestiveSymptomStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CORRECTED', 'CANCELLED');
CREATE TYPE "DigestiveSymptomFoodLinkSource" AS ENUM ('MEAL_SELECTED', 'FOOD_FROM_MEAL', 'MANUAL_HYPOTHESIS');

CREATE TABLE "digestive_symptom_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adult_profile_id" UUID NOT NULL,
  "type" "DigestiveSymptomType" NOT NULL,
  "custom_type_name" VARCHAR(150),
  "intensity" INTEGER NOT NULL,
  "start_at" TIMESTAMPTZ(6) NOT NULL,
  "end_at" TIMESTAMPTZ(6),
  "notes" TEXT,
  "status" "DigestiveSymptomStatus" NOT NULL DEFAULT 'ACTIVE',
  "corrected_from_id" UUID,
  CONSTRAINT "digestive_symptom_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digestive_symptom_entries_intensity_check" CHECK ("intensity" BETWEEN 1 AND 5),
  CONSTRAINT "digestive_symptom_entries_dates_check" CHECK ("end_at" IS NULL OR "end_at" >= "start_at"),
  CONSTRAINT "digestive_symptom_entries_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "digestive_symptom_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "digestive_symptom_entries"("id") ON DELETE RESTRICT
);
CREATE INDEX "digestive_symptom_entries_profile_type_start_idx" ON "digestive_symptom_entries" ("adult_profile_id", "type", "start_at");
CREATE INDEX "digestive_symptom_entries_profile_intensity_start_idx" ON "digestive_symptom_entries" ("adult_profile_id", "intensity", "start_at");
CREATE INDEX "digestive_symptom_entries_profile_status_start_idx" ON "digestive_symptom_entries" ("adult_profile_id", "status", "start_at");
CREATE INDEX "digestive_symptom_entries_corrected_from_idx" ON "digestive_symptom_entries" ("corrected_from_id");

CREATE TABLE "digestive_symptom_meal_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "symptom_id" UUID NOT NULL,
  "meal_id" UUID NOT NULL,
  CONSTRAINT "digestive_symptom_meal_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digestive_symptom_meal_links_symptom_id_meal_id_key" UNIQUE ("symptom_id", "meal_id"),
  CONSTRAINT "digestive_symptom_meal_links_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "digestive_symptom_entries"("id") ON DELETE CASCADE,
  CONSTRAINT "digestive_symptom_meal_links_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE RESTRICT
);
CREATE INDEX "digestive_symptom_meal_links_meal_id_idx" ON "digestive_symptom_meal_links" ("meal_id");

CREATE TABLE "digestive_symptom_food_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "symptom_id" UUID NOT NULL,
  "food_id" UUID NOT NULL,
  "meal_id" UUID,
  "source" "DigestiveSymptomFoodLinkSource" NOT NULL,
  "food_name_snapshot" VARCHAR(150),
  "snapshot" JSONB,
  CONSTRAINT "digestive_symptom_food_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digestive_symptom_food_links_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "digestive_symptom_entries"("id") ON DELETE CASCADE,
  CONSTRAINT "digestive_symptom_food_links_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT,
  CONSTRAINT "digestive_symptom_food_links_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "digestive_symptom_food_links_unique_idx" ON "digestive_symptom_food_links" ("symptom_id", "food_id", "meal_id", "source");
CREATE INDEX "digestive_symptom_food_links_food_id_idx" ON "digestive_symptom_food_links" ("food_id");
CREATE INDEX "digestive_symptom_food_links_meal_id_idx" ON "digestive_symptom_food_links" ("meal_id");
