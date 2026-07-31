CREATE TYPE "RecipeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "RecipeIngredientUnit" AS ENUM ('GRAM', 'MILLILITER', 'UNIT', 'SERVING');

CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "default_servings" INTEGER NOT NULL,
    "estimated_preparation_minutes" INTEGER,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "RecipeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" "RecipeIngredientUnit" NOT NULL,
    "serving_id" UUID,
    "position" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recipe_instructions" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "recipe_instructions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recipes_household_id_status_name_idx" ON "recipes"("household_id", "status", "name");
CREATE INDEX "recipes_created_by_id_idx" ON "recipes"("created_by_id");
CREATE INDEX "recipes_deleted_at_idx" ON "recipes"("deleted_at");
CREATE UNIQUE INDEX "recipes_household_id_lower_name_key" ON "recipes"("household_id", LOWER("name"));
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_position_key" ON "recipe_ingredients"("recipe_id", "position");
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");
CREATE INDEX "recipe_ingredients_food_id_idx" ON "recipe_ingredients"("food_id");
CREATE INDEX "recipe_ingredients_serving_id_idx" ON "recipe_ingredients"("serving_id");
CREATE UNIQUE INDEX "recipe_instructions_recipe_id_position_key" ON "recipe_instructions"("recipe_id", "position");
CREATE INDEX "recipe_instructions_recipe_id_idx" ON "recipe_instructions"("recipe_id");

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_serving_id_fkey" FOREIGN KEY ("serving_id") REFERENCES "food_servings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
