ALTER TABLE "planned_meals" ADD COLUMN "previous_meal_id" UUID;

CREATE INDEX "planned_meals_previous_meal_id_idx" ON "planned_meals"("previous_meal_id");

ALTER TABLE "planned_meals"
ADD CONSTRAINT "planned_meals_previous_meal_id_fkey"
FOREIGN KEY ("previous_meal_id") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
