CREATE TYPE "BiologicalSex" AS ENUM ('MALE', 'FEMALE');

CREATE TYPE "ActivityLevel" AS ENUM (
    'SEDENTARY',
    'LIGHT',
    'MODERATE',
    'HIGH',
    'VERY_HIGH'
);

CREATE TYPE "PrimaryGoal" AS ENUM (
    'FAT_LOSS',
    'MAINTENANCE',
    'MUSCLE_GAIN'
);

CREATE TYPE "DietaryRestrictionType" AS ENUM (
    'ALLERGY',
    'INTOLERANCE',
    'PREFERENCE'
);

CREATE TABLE "adult_profiles" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "birth_date" DATE NOT NULL,
    "biological_sex" "BiologicalSex" NOT NULL,
    "height_cm" DECIMAL(5,2) NOT NULL,
    "activity_level" "ActivityLevel" NOT NULL,
    "primary_goal" "PrimaryGoal" NOT NULL,
    "has_kitchen_scale" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "adult_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "adult_profiles_height_cm_check" CHECK ("height_cm" > 0)
);

CREATE TABLE "dietary_restrictions" (
    "id" UUID NOT NULL,
    "adult_profile_id" UUID NOT NULL,
    "type" "DietaryRestrictionType" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "severity" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dietary_restrictions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "adult_profiles_household_user_active_key"
    ON "adult_profiles" ("household_id", "user_id")
    WHERE "is_active" = true AND "deleted_at" IS NULL;

CREATE INDEX "adult_profiles_household_id_is_active_idx"
    ON "adult_profiles" ("household_id", "is_active");
CREATE INDEX "adult_profiles_user_id_is_active_idx"
    ON "adult_profiles" ("user_id", "is_active");
CREATE INDEX "dietary_restrictions_adult_profile_id_idx"
    ON "dietary_restrictions" ("adult_profile_id");

ALTER TABLE "adult_profiles"
    ADD CONSTRAINT "adult_profiles_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "adult_profiles"
    ADD CONSTRAINT "adult_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dietary_restrictions"
    ADD CONSTRAINT "dietary_restrictions_adult_profile_id_fkey"
    FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
