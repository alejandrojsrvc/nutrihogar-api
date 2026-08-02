CREATE TYPE "PlannedMealParticipantStatus" AS ENUM ('PLANNED', 'CONSUMED', 'SKIPPED');

ALTER TABLE "planned_meal_participants"
ADD COLUMN "status" "PlannedMealParticipantStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN "consumed_meal_id" UUID;

CREATE INDEX "planned_meal_participants_consumed_meal_id_idx"
ON "planned_meal_participants"("consumed_meal_id");

ALTER TABLE "planned_meal_participants"
ADD CONSTRAINT "planned_meal_participants_consumed_meal_id_fkey"
FOREIGN KEY ("consumed_meal_id") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
