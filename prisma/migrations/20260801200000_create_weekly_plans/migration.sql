CREATE TYPE "WeeklyPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PlannedMealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
CREATE TYPE "PlannedMealStatus" AS ENUM ('PLANNED', 'PREPARED', 'SERVED', 'CONSUMED', 'SKIPPED', 'REPLACED', 'CANCELLED');
CREATE TYPE "PlannedMealSource" AS ENUM ('RECIPE', 'PREVIOUS_MEAL', 'FREE_MEAL', 'RESTAURANT', 'DELIVERY', 'UNPLANNED', 'EMPTY');

CREATE TABLE "weekly_plans" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "status" "WeeklyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "weekly_budget" DECIMAL(18,6),
    "currency" VARCHAR(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planned_meals" (
    "id" UUID NOT NULL,
    "weekly_plan_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "PlannedMealType" NOT NULL,
    "source" "PlannedMealSource" NOT NULL,
    "recipe_id" UUID,
    "name_snapshot" VARCHAR(150),
    "nutrition_snapshot" JSONB,
    "notes" TEXT,
    "status" "PlannedMealStatus" NOT NULL DEFAULT 'PLANNED',
    "position" INTEGER NOT NULL,
    "replaced_meal_id" UUID,
    "prepared_batch_id" UUID,
    "meal_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "planned_meals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planned_meal_participants" (
    "id" UUID NOT NULL,
    "planned_meal_id" UUID NOT NULL,
    "adult_profile_id" UUID NOT NULL,
    "suggested_quantity" DECIMAL(30,12),
    "suggested_unit" VARCHAR(50),
    "confirmed_quantity" DECIMAL(30,12),
    "confirmed_unit" VARCHAR(50),
    "nutrition_target_snapshot" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "planned_meal_participants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "weekly_plans_household_id_week_start_status_idx" ON "weekly_plans" ("household_id", "week_start", "status");
CREATE UNIQUE INDEX "weekly_plans_active_household_week_key" ON "weekly_plans" ("household_id", "week_start") WHERE "status" = 'ACTIVE';
CREATE INDEX "planned_meals_weekly_plan_id_date_type_idx" ON "planned_meals" ("weekly_plan_id", "date", "type");
CREATE INDEX "planned_meals_weekly_plan_id_status_idx" ON "planned_meals" ("weekly_plan_id", "status");
CREATE INDEX "planned_meal_participants_planned_meal_id_idx" ON "planned_meal_participants" ("planned_meal_id");
CREATE INDEX "planned_meal_participants_adult_profile_id_idx" ON "planned_meal_participants" ("adult_profile_id");
CREATE UNIQUE INDEX "planned_meal_participants_planned_meal_id_adult_profile_id_key" ON "planned_meal_participants" ("planned_meal_id", "adult_profile_id");

ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_weekly_plan_id_fkey" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_prepared_batch_id_fkey" FOREIGN KEY ("prepared_batch_id") REFERENCES "prepared_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_replaced_meal_id_fkey" FOREIGN KEY ("replaced_meal_id") REFERENCES "planned_meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planned_meal_participants" ADD CONSTRAINT "planned_meal_participants_planned_meal_id_fkey" FOREIGN KEY ("planned_meal_id") REFERENCES "planned_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planned_meal_participants" ADD CONSTRAINT "planned_meal_participants_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
