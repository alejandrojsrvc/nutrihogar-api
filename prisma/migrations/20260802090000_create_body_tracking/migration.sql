CREATE TYPE "BodyWeightUnit" AS ENUM ('KG', 'LB');
CREATE TYPE "BodyMeasurementUnit" AS ENUM ('CM', 'IN');
CREATE TYPE "BodyMeasurementSource" AS ENUM ('MANUAL', 'IMPORTED', 'DEVICE');
CREATE TYPE "BodyMeasurementType" AS ENUM ('WAIST', 'HIPS', 'CHEST', 'ARM_LEFT', 'ARM_RIGHT', 'THIGH_LEFT', 'THIGH_RIGHT', 'NECK', 'CALF_LEFT', 'CALF_RIGHT', 'CUSTOM');

CREATE TABLE "body_weight_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adult_profile_id" UUID NOT NULL,
  "value" DECIMAL(18,6) NOT NULL,
  "unit" "BodyWeightUnit" NOT NULL,
  "recorded_at" TIMESTAMPTZ(6) NOT NULL,
  "source" "BodyMeasurementSource" NOT NULL,
  "corrected_from_id" UUID,
  CONSTRAINT "body_weight_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "body_weight_entries_value_positive" CHECK ("value" > 0),
  CONSTRAINT "body_weight_entries_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "body_weight_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "body_weight_entries"("id") ON DELETE RESTRICT
);
CREATE INDEX "body_weight_entries_adult_profile_id_recorded_at_idx" ON "body_weight_entries"("adult_profile_id", "recorded_at");
CREATE INDEX "body_weight_entries_adult_profile_id_unit_idx" ON "body_weight_entries"("adult_profile_id", "unit");
CREATE INDEX "body_weight_entries_corrected_from_id_idx" ON "body_weight_entries"("corrected_from_id");

CREATE TABLE "body_measurement_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adult_profile_id" UUID NOT NULL,
  "type" "BodyMeasurementType" NOT NULL,
  "custom_measurement_name" VARCHAR(100),
  "value" DECIMAL(18,6) NOT NULL,
  "unit" "BodyMeasurementUnit" NOT NULL,
  "recorded_at" TIMESTAMPTZ(6) NOT NULL,
  "source" "BodyMeasurementSource" NOT NULL,
  "corrected_from_id" UUID,
  CONSTRAINT "body_measurement_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "body_measurement_entries_value_positive" CHECK ("value" > 0),
  CONSTRAINT "body_measurement_entries_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "body_measurement_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "body_measurement_entries"("id") ON DELETE RESTRICT
);
CREATE INDEX "body_measurement_entries_adult_profile_id_recorded_at_idx" ON "body_measurement_entries"("adult_profile_id", "recorded_at");
CREATE INDEX "body_measurement_entries_adult_profile_id_type_recorded_at_idx" ON "body_measurement_entries"("adult_profile_id", "type", "recorded_at");
CREATE INDEX "body_measurement_entries_corrected_from_id_idx" ON "body_measurement_entries"("corrected_from_id");

CREATE TABLE "measurement_configurations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adult_profile_id" UUID NOT NULL,
  "enabled_types" "BodyMeasurementType"[] NOT NULL,
  "units" JSONB NOT NULL,
  CONSTRAINT "measurement_configurations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurement_configurations_adult_profile_id_key" UNIQUE ("adult_profile_id"),
  CONSTRAINT "measurement_configurations_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE
);

CREATE TABLE "custom_measurement_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "configuration_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "normalized_name" VARCHAR(100) NOT NULL,
  "unit" "BodyMeasurementUnit" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "custom_measurement_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "custom_measurement_definitions_configuration_id_normalized_name_key" UNIQUE ("configuration_id", "normalized_name"),
  CONSTRAINT "custom_measurement_definitions_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "measurement_configurations"("id") ON DELETE CASCADE
);
CREATE INDEX "custom_measurement_definitions_configuration_id_enabled_idx" ON "custom_measurement_definitions"("configuration_id", "enabled");
