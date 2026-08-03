CREATE TYPE "NutritionGoalReviewTerminalAction" AS ENUM ('ACCEPTED', 'REJECTED', 'POSTPONED');

CREATE TABLE "nutrition_goal_reviews" (
    "id" UUID NOT NULL,
    "adult_profile_id" UUID NOT NULL,
    "outcome" VARCHAR(50) NOT NULL,
    "reasons" JSONB NOT NULL,
    "evaluated_at" TIMESTAMPTZ(6) NOT NULL,
    "postponed_until" TIMESTAMPTZ(6),
    "proposal_suggestion_id" UUID,
    "terminal_action" "NutritionGoalReviewTerminalAction",
    "acted_by_id" UUID,
    "acted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nutrition_goal_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nutrition_goal_reviews_proposal_suggestion_id_key" ON "nutrition_goal_reviews"("proposal_suggestion_id");
CREATE INDEX "nutrition_goal_reviews_adult_profile_id_evaluated_at_idx" ON "nutrition_goal_reviews"("adult_profile_id", "evaluated_at");
CREATE INDEX "nutrition_goal_reviews_adult_profile_id_postponed_until_idx" ON "nutrition_goal_reviews"("adult_profile_id", "postponed_until");
ALTER TABLE "nutrition_goal_reviews" ADD CONSTRAINT "nutrition_goal_reviews_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nutrition_goal_reviews" ADD CONSTRAINT "nutrition_goal_reviews_proposal_suggestion_id_fkey" FOREIGN KEY ("proposal_suggestion_id") REFERENCES "nutrition_goal_suggestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
