ALTER TABLE "adult_profiles"
ADD COLUMN "weight_kg" DECIMAL(5, 2);

ALTER TABLE "adult_profiles"
ADD CONSTRAINT "adult_profiles_weight_kg_positive"
CHECK ("weight_kg" IS NULL OR "weight_kg" > 0);
