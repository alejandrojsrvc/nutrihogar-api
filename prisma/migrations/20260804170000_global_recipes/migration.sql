-- Global recipe catalog: recipes available to every household.
ALTER TABLE "recipes"
    ADD COLUMN "is_global" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "recipes"
    ALTER COLUMN "household_id" DROP NOT NULL;

ALTER TABLE "recipes"
    ALTER COLUMN "created_by_id" DROP NOT NULL;

CREATE INDEX "recipes_is_global_status_name_idx" ON "recipes" ("is_global", "status", "name");
