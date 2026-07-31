CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'EXTRA');
CREATE TYPE "MealStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE "MealSource" AS ENUM ('MANUAL', 'DUPLICATED');
CREATE TYPE "MealMeasurementMethod" AS ENUM ('WEIGHED', 'SERVING', 'UNIT', 'APPROXIMATED');

CREATE TABLE "meals" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "adult_profile_id" UUID NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "consumed_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "MealStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "MealSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_items" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "food_id" UUID,
    "food_serving_id" UUID,
    "name_snapshot" VARCHAR(150) NOT NULL,
    "brand_snapshot" VARCHAR(150),
    "preparation_state_snapshot" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "base_quantity" DECIMAL(18,6) NOT NULL,
    "base_unit" VARCHAR(20) NOT NULL,
    "measurement_method" "MealMeasurementMethod" NOT NULL,
    "confidence_level" "ConfidenceLevel" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_item_nutrient_snapshots" (
    "id" UUID NOT NULL,
    "meal_item_id" UUID NOT NULL,
    "nutrient_code" VARCHAR(50) NOT NULL,
    "nutrient_name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    CONSTRAINT "meal_item_nutrient_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meals_household_id_consumed_at_idx" ON "meals"("household_id", "consumed_at");
CREATE INDEX "meals_adult_profile_id_consumed_at_idx" ON "meals"("adult_profile_id", "consumed_at");
CREATE INDEX "meals_status_consumed_at_idx" ON "meals"("status", "consumed_at");
CREATE INDEX "meals_created_by_id_idx" ON "meals"("created_by_id");
CREATE INDEX "meal_items_meal_id_idx" ON "meal_items"("meal_id");
CREATE INDEX "meal_items_food_id_idx" ON "meal_items"("food_id");
CREATE INDEX "meal_items_food_serving_id_idx" ON "meal_items"("food_serving_id");
CREATE UNIQUE INDEX "meal_item_nutrient_snapshots_meal_item_id_nutrient_code_key" ON "meal_item_nutrient_snapshots"("meal_item_id", "nutrient_code");
CREATE INDEX "meal_item_nutrient_snapshots_meal_item_id_idx" ON "meal_item_nutrient_snapshots"("meal_item_id");

ALTER TABLE "meals" ADD CONSTRAINT "meals_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meals" ADD CONSTRAINT "meals_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meals" ADD CONSTRAINT "meals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_serving_id_fkey" FOREIGN KEY ("food_serving_id") REFERENCES "food_servings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meal_item_nutrient_snapshots" ADD CONSTRAINT "meal_item_nutrient_snapshots_meal_item_id_fkey" FOREIGN KEY ("meal_item_id") REFERENCES "meal_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
