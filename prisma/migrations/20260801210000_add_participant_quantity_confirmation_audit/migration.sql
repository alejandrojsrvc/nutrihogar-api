ALTER TABLE "planned_meal_participants"
  ADD COLUMN "confirmed_by_id" UUID,
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN "confirmation_snapshot" JSONB;

CREATE INDEX "planned_meal_participants_confirmed_by_id_idx"
  ON "planned_meal_participants"("confirmed_by_id");

ALTER TABLE "planned_meal_participants"
  ADD CONSTRAINT "planned_meal_participants_confirmed_by_id_fkey"
  FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
