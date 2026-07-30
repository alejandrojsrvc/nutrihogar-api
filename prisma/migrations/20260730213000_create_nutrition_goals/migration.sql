CREATE TYPE "NutritionGoalSuggestionStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'EXPIRED'
);

CREATE TABLE "nutrition_goal_suggestions" (
  "id" UUID NOT NULL,
  "adult_profile_id" UUID NOT NULL,
  "calculation_method" VARCHAR(100) NOT NULL,
  "calculation_input" JSONB NOT NULL,
  "bmr" DECIMAL(12, 4) NOT NULL,
  "tdee" DECIMAL(12, 4) NOT NULL,
  "suggested_calories" DECIMAL(12, 4) NOT NULL,
  "suggested_protein_grams" DECIMAL(12, 4) NOT NULL,
  "suggested_carbohydrate_grams" DECIMAL(12, 4) NOT NULL,
  "suggested_fat_grams" DECIMAL(12, 4) NOT NULL,
  "suggested_fiber_grams" DECIMAL(12, 4) NOT NULL,
  "status" "NutritionGoalSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "nutrition_goal_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "nutrition_goal_suggestions_positive_values_check" CHECK (
    "bmr" > 0
    AND "tdee" > 0
    AND "suggested_calories" > 0
    AND "suggested_protein_grams" > 0
    AND "suggested_carbohydrate_grams" > 0
    AND "suggested_fat_grams" > 0
    AND "suggested_fiber_grams" > 0
  ),
  CONSTRAINT "nutrition_goal_suggestions_expiration_check" CHECK ("expires_at" > "created_at")
);

CREATE TABLE "nutrition_goals" (
  "id" UUID NOT NULL,
  "adult_profile_id" UUID NOT NULL,
  "valid_from" TIMESTAMPTZ(6) NOT NULL,
  "valid_until" TIMESTAMPTZ(6),
  "daily_calories" DECIMAL(12, 4) NOT NULL,
  "protein_grams" DECIMAL(12, 4) NOT NULL,
  "carbohydrate_grams" DECIMAL(12, 4) NOT NULL,
  "fat_grams" DECIMAL(12, 4) NOT NULL,
  "fiber_grams" DECIMAL(12, 4) NOT NULL,
  "goal_type" VARCHAR(50) NOT NULL,
  "calculation_method" VARCHAR(100) NOT NULL,
  "calculation_input" JSONB NOT NULL,
  "confirmed_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "nutrition_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "nutrition_goals_positive_values_check" CHECK (
    "daily_calories" > 0
    AND "protein_grams" > 0
    AND "carbohydrate_grams" > 0
    AND "fat_grams" > 0
    AND "fiber_grams" > 0
  ),
  CONSTRAINT "nutrition_goals_valid_period_check" CHECK (
    "valid_until" IS NULL OR "valid_until" >= "valid_from"
  )
);

CREATE INDEX "nutrition_goal_suggestions_adult_profile_id_status_idx"
  ON "nutrition_goal_suggestions"("adult_profile_id", "status");
CREATE INDEX "nutrition_goal_suggestions_status_expires_at_idx"
  ON "nutrition_goal_suggestions"("status", "expires_at");
CREATE INDEX "nutrition_goals_adult_profile_id_valid_from_idx"
  ON "nutrition_goals"("adult_profile_id", "valid_from");
CREATE INDEX "nutrition_goals_confirmed_by_id_idx"
  ON "nutrition_goals"("confirmed_by_id");
CREATE UNIQUE INDEX "nutrition_goals_one_active_per_profile_idx"
  ON "nutrition_goals"("adult_profile_id")
  WHERE "valid_until" IS NULL;

ALTER TABLE "nutrition_goal_suggestions"
  ADD CONSTRAINT "nutrition_goal_suggestions_adult_profile_id_fkey"
  FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutrition_goals"
  ADD CONSTRAINT "nutrition_goals_adult_profile_id_fkey"
  FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutrition_goals"
  ADD CONSTRAINT "nutrition_goals_confirmed_by_id_fkey"
  FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
