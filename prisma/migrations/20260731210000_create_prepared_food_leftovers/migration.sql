ALTER TYPE "MealSource" ADD VALUE 'PREPARED_BATCH';

CREATE TYPE "PreparedFoodLeftoverStatus" AS ENUM ('AVAILABLE', 'CONSUMED', 'DISCARDED', 'EXPIRED');

CREATE TABLE "prepared_food_leftovers" (
    "id" UUID NOT NULL,
    "prepared_batch_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "available_weight" DECIMAL(18,6) NOT NULL,
    "stored_at" TIMESTAMPTZ(6) NOT NULL,
    "storage_location" VARCHAR(100),
    "notes" TEXT,
    "status" "PreparedFoodLeftoverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "prepared_food_leftovers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prepared_food_leftover_nutrient_snapshots" (
    "id" UUID NOT NULL,
    "prepared_food_leftover_id" UUID NOT NULL,
    "nutrient_code" VARCHAR(50) NOT NULL,
    "nutrient_name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "amount_per_gram" DECIMAL(18,6) NOT NULL,
    CONSTRAINT "prepared_food_leftover_nutrient_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prepared_food_leftovers_prepared_batch_id_status_idx"
    ON "prepared_food_leftovers"("prepared_batch_id", "status");
CREATE INDEX "prepared_food_leftovers_household_id_status_stored_at_idx"
    ON "prepared_food_leftovers"("household_id", "status", "stored_at");
CREATE UNIQUE INDEX "prepared_food_leftover_nutrient_snapshots_leftover_id_code_key"
    ON "prepared_food_leftover_nutrient_snapshots"("prepared_food_leftover_id", "nutrient_code");
CREATE INDEX "prepared_food_leftover_nutrient_snapshots_leftover_id_idx"
    ON "prepared_food_leftover_nutrient_snapshots"("prepared_food_leftover_id");

ALTER TABLE "prepared_food_leftovers"
    ADD CONSTRAINT "prepared_food_leftovers_prepared_batch_id_fkey"
    FOREIGN KEY ("prepared_batch_id") REFERENCES "prepared_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prepared_food_leftovers"
    ADD CONSTRAINT "prepared_food_leftovers_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prepared_food_leftover_nutrient_snapshots"
    ADD CONSTRAINT "prepared_food_leftover_nutrient_snapshots_leftover_id_fkey"
    FOREIGN KEY ("prepared_food_leftover_id") REFERENCES "prepared_food_leftovers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
