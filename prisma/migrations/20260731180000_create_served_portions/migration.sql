CREATE TYPE "ServedPortionStatus" AS ENUM ('SERVED', 'CONSUMED', 'CANCELLED');
CREATE TYPE "PortionRemainderDisposition" AS ENUM ('SAVED', 'DISCARDED', 'SHARED', 'CONSUMED_LATER');

CREATE TABLE "served_portions" (
    "id" UUID NOT NULL,
    "prepared_batch_id" UUID NOT NULL,
    "adult_profile_id" UUID NOT NULL,
    "served_weight" DECIMAL(18,6) NOT NULL,
    "served_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "ServedPortionStatus" NOT NULL DEFAULT 'SERVED',
    "remainder_weight" DECIMAL(18,6),
    "consumed_weight" DECIMAL(18,6),
    "meal_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    CONSTRAINT "served_portions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portion_remainders" (
    "id" UUID NOT NULL,
    "served_portion_id" UUID NOT NULL,
    "weight" DECIMAL(18,6) NOT NULL,
    "disposition" "PortionRemainderDisposition" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portion_remainders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "served_portion_nutrient_snapshots" (
    "id" UUID NOT NULL,
    "served_portion_id" UUID NOT NULL,
    "nutrient_code" VARCHAR(50) NOT NULL,
    "nutrient_name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    CONSTRAINT "served_portion_nutrient_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "served_portions_prepared_batch_id_status_idx"
    ON "served_portions"("prepared_batch_id", "status");
CREATE INDEX "served_portions_adult_profile_id_served_at_idx"
    ON "served_portions"("adult_profile_id", "served_at");
CREATE INDEX "served_portions_created_by_id_idx" ON "served_portions"("created_by_id");
CREATE INDEX "served_portions_meal_id_idx" ON "served_portions"("meal_id");
CREATE UNIQUE INDEX "portion_remainders_served_portion_id_key"
    ON "portion_remainders"("served_portion_id");
CREATE INDEX "portion_remainders_disposition_created_at_idx"
    ON "portion_remainders"("disposition", "created_at");
CREATE UNIQUE INDEX "served_portion_nutrient_snapshots_portion_id_code_key"
    ON "served_portion_nutrient_snapshots"("served_portion_id", "nutrient_code");
CREATE INDEX "served_portion_nutrient_snapshots_portion_id_idx"
    ON "served_portion_nutrient_snapshots"("served_portion_id");

ALTER TABLE "served_portions"
    ADD CONSTRAINT "served_portions_prepared_batch_id_fkey"
    FOREIGN KEY ("prepared_batch_id") REFERENCES "prepared_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "served_portions"
    ADD CONSTRAINT "served_portions_adult_profile_id_fkey"
    FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "served_portions"
    ADD CONSTRAINT "served_portions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portion_remainders"
    ADD CONSTRAINT "portion_remainders_served_portion_id_fkey"
    FOREIGN KEY ("served_portion_id") REFERENCES "served_portions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "served_portion_nutrient_snapshots"
    ADD CONSTRAINT "served_portion_nutrient_snapshots_portion_id_fkey"
    FOREIGN KEY ("served_portion_id") REFERENCES "served_portions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
