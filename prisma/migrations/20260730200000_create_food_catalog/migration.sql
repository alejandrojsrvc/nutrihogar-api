CREATE TYPE "FoodType" AS ENUM (
    'GENERIC',
    'COMMERCIAL',
    'CUSTOM',
    'PREPARED'
);

CREATE TYPE "PreparationState" AS ENUM (
    'RAW',
    'COOKED',
    'READY_TO_EAT',
    'NOT_APPLICABLE'
);

CREATE TYPE "ReferenceUnit" AS ENUM (
    'GRAM',
    'MILLILITER',
    'UNIT'
);

CREATE TYPE "ConfidenceLevel" AS ENUM (
    'VERIFIED',
    'HIGH',
    'MEDIUM',
    'LOW',
    'USER_PROVIDED'
);

CREATE TABLE "food_categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "food_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nutrient_definitions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "nutrient_group" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "nutrient_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "foods" (
    "id" UUID NOT NULL,
    "household_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "brand" VARCHAR(150),
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "food_type" "FoodType" NOT NULL,
    "preparation_state" "PreparationState" NOT NULL,
    "reference_quantity" DECIMAL(12,4) NOT NULL,
    "reference_unit" "ReferenceUnit" NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "source_reference" VARCHAR(255),
    "confidence_level" "ConfidenceLevel" NOT NULL,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "foods_reference_quantity_check" CHECK ("reference_quantity" > 0),
    CONSTRAINT "foods_global_scope_check" CHECK (
        ("is_global" = true AND "household_id" IS NULL)
        OR ("is_global" = false AND "household_id" IS NOT NULL)
    ),
    CONSTRAINT "foods_custom_scope_check" CHECK (
        "food_type" <> 'CUSTOM'
        OR ("household_id" IS NOT NULL AND "is_global" = false)
    )
);

CREATE TABLE "food_nutrients" (
    "id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "nutrient_definition_id" UUID NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "food_nutrients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "food_nutrients_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "food_servings" (
    "id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "equivalent_grams" DECIMAL(12,4),
    "equivalent_milliliters" DECIMAL(12,4),

    CONSTRAINT "food_servings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "food_servings_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "food_servings_equivalent_grams_check"
        CHECK ("equivalent_grams" IS NULL OR "equivalent_grams" > 0),
    CONSTRAINT "food_servings_equivalent_milliliters_check"
        CHECK ("equivalent_milliliters" IS NULL OR "equivalent_milliliters" > 0)
);

CREATE TABLE "food_aliases" (
    "id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "alias" VARCHAR(150) NOT NULL,

    CONSTRAINT "food_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "food_categories_code_key"
    ON "food_categories"("code");
CREATE INDEX "food_categories_is_active_display_order_idx"
    ON "food_categories"("is_active", "display_order");

CREATE UNIQUE INDEX "nutrient_definitions_code_key"
    ON "nutrient_definitions"("code");
CREATE INDEX "nutrient_definitions_nutrient_group_display_order_idx"
    ON "nutrient_definitions"("nutrient_group", "display_order");
CREATE INDEX "nutrient_definitions_is_required_idx"
    ON "nutrient_definitions"("is_required");

CREATE UNIQUE INDEX "foods_source_source_reference_key"
    ON "foods"("source", "source_reference");
CREATE INDEX "foods_household_id_is_active_idx"
    ON "foods"("household_id", "is_active");
CREATE INDEX "foods_is_global_is_active_idx"
    ON "foods"("is_global", "is_active");
CREATE INDEX "foods_category_id_is_active_idx"
    ON "foods"("category_id", "is_active");
CREATE INDEX "foods_name_idx" ON "foods"("name");
CREATE INDEX "foods_created_by_id_idx" ON "foods"("created_by_id");
CREATE INDEX "foods_deleted_at_idx" ON "foods"("deleted_at");

CREATE UNIQUE INDEX "food_nutrients_food_id_nutrient_definition_id_key"
    ON "food_nutrients"("food_id", "nutrient_definition_id");
CREATE INDEX "food_nutrients_nutrient_definition_id_idx"
    ON "food_nutrients"("nutrient_definition_id");

CREATE INDEX "food_servings_food_id_idx" ON "food_servings"("food_id");

CREATE UNIQUE INDEX "food_aliases_food_id_alias_key"
    ON "food_aliases"("food_id", "alias");
CREATE INDEX "food_aliases_alias_idx" ON "food_aliases"("alias");

ALTER TABLE "foods"
    ADD CONSTRAINT "foods_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "foods"
    ADD CONSTRAINT "foods_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "food_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "foods"
    ADD CONSTRAINT "foods_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "food_nutrients"
    ADD CONSTRAINT "food_nutrients_food_id_fkey"
    FOREIGN KEY ("food_id") REFERENCES "foods"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "food_nutrients"
    ADD CONSTRAINT "food_nutrients_nutrient_definition_id_fkey"
    FOREIGN KEY ("nutrient_definition_id") REFERENCES "nutrient_definitions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "food_servings"
    ADD CONSTRAINT "food_servings_food_id_fkey"
    FOREIGN KEY ("food_id") REFERENCES "foods"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "food_aliases"
    ADD CONSTRAINT "food_aliases_food_id_fkey"
    FOREIGN KEY ("food_id") REFERENCES "foods"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
