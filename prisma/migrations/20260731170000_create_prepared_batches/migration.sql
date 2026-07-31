CREATE TYPE "PreparedBatchStatus" AS ENUM ('DRAFT', 'INGREDIENTS_CONFIRMED', 'FINALIZED', 'CANCELLED');

CREATE TABLE "prepared_batches" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "recipe_id" UUID,
    "recipe_name_snapshot" VARCHAR(150) NOT NULL,
    "prepared_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "PreparedBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "final_cooked_weight" DECIMAL(18,6),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "finalized_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    CONSTRAINT "prepared_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prepared_batch_ingredients" (
    "id" UUID NOT NULL,
    "prepared_batch_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "food_serving_id" UUID,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" "RecipeIngredientUnit" NOT NULL,
    "position" INTEGER NOT NULL,
    "notes" TEXT,
    "food_name_snapshot" VARCHAR(150),
    "brand_snapshot" VARCHAR(150),
    "preparation_state_snapshot" "PreparationState",
    "confidence_level" "ConfidenceLevel",
    "base_quantity" DECIMAL(18,6),
    "base_unit" VARCHAR(20),
    CONSTRAINT "prepared_batch_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prepared_batch_ingredient_nutrient_snapshots" (
    "id" UUID NOT NULL,
    "prepared_batch_ingredient_id" UUID NOT NULL,
    "nutrient_code" VARCHAR(50) NOT NULL,
    "nutrient_name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    CONSTRAINT "prepared_batch_ingredient_nutrient_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prepared_batch_nutrient_snapshots" (
    "id" UUID NOT NULL,
    "prepared_batch_id" UUID NOT NULL,
    "nutrient_code" VARCHAR(50) NOT NULL,
    "nutrient_name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    CONSTRAINT "prepared_batch_nutrient_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prepared_batches_household_id_status_prepared_at_idx"
    ON "prepared_batches"("household_id", "status", "prepared_at");
CREATE INDEX "prepared_batches_recipe_id_idx" ON "prepared_batches"("recipe_id");
CREATE INDEX "prepared_batches_created_by_id_idx" ON "prepared_batches"("created_by_id");
CREATE UNIQUE INDEX "prepared_batch_ingredients_prepared_batch_id_position_key"
    ON "prepared_batch_ingredients"("prepared_batch_id", "position");
CREATE INDEX "prepared_batch_ingredients_prepared_batch_id_idx"
    ON "prepared_batch_ingredients"("prepared_batch_id");
CREATE INDEX "prepared_batch_ingredients_food_id_idx"
    ON "prepared_batch_ingredients"("food_id");
CREATE INDEX "prepared_batch_ingredients_food_serving_id_idx"
    ON "prepared_batch_ingredients"("food_serving_id");
CREATE UNIQUE INDEX "prepared_batch_ingredient_nutrient_snapshots_ingredient_id_code_key"
    ON "prepared_batch_ingredient_nutrient_snapshots"("prepared_batch_ingredient_id", "nutrient_code");
CREATE INDEX "prepared_batch_ingredient_nutrient_snapshots_ingredient_id_idx"
    ON "prepared_batch_ingredient_nutrient_snapshots"("prepared_batch_ingredient_id");
CREATE UNIQUE INDEX "prepared_batch_nutrient_snapshots_batch_id_code_key"
    ON "prepared_batch_nutrient_snapshots"("prepared_batch_id", "nutrient_code");
CREATE INDEX "prepared_batch_nutrient_snapshots_batch_id_idx"
    ON "prepared_batch_nutrient_snapshots"("prepared_batch_id");

ALTER TABLE "prepared_batches"
    ADD CONSTRAINT "prepared_batches_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prepared_batches"
    ADD CONSTRAINT "prepared_batches_recipe_id_fkey"
    FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prepared_batches"
    ADD CONSTRAINT "prepared_batches_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prepared_batch_ingredients"
    ADD CONSTRAINT "prepared_batch_ingredients_prepared_batch_id_fkey"
    FOREIGN KEY ("prepared_batch_id") REFERENCES "prepared_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prepared_batch_ingredients"
    ADD CONSTRAINT "prepared_batch_ingredients_food_id_fkey"
    FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prepared_batch_ingredients"
    ADD CONSTRAINT "prepared_batch_ingredients_food_serving_id_fkey"
    FOREIGN KEY ("food_serving_id") REFERENCES "food_servings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prepared_batch_ingredient_nutrient_snapshots"
    ADD CONSTRAINT "prepared_batch_ingredient_nutrient_snapshots_ingredient_id_fkey"
    FOREIGN KEY ("prepared_batch_ingredient_id") REFERENCES "prepared_batch_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prepared_batch_nutrient_snapshots"
    ADD CONSTRAINT "prepared_batch_nutrient_snapshots_batch_id_fkey"
    FOREIGN KEY ("prepared_batch_id") REFERENCES "prepared_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
