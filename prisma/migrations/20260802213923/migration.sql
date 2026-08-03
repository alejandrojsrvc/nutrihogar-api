-- DropForeignKey
ALTER TABLE "body_measurement_entries" DROP CONSTRAINT "body_measurement_entries_adult_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "body_measurement_entries" DROP CONSTRAINT "body_measurement_entries_corrected_from_id_fkey";

-- DropForeignKey
ALTER TABLE "body_weight_entries" DROP CONSTRAINT "body_weight_entries_adult_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "body_weight_entries" DROP CONSTRAINT "body_weight_entries_corrected_from_id_fkey";

-- DropForeignKey
ALTER TABLE "custom_measurement_definitions" DROP CONSTRAINT "custom_measurement_definitions_configuration_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_entries" DROP CONSTRAINT "digestive_symptom_entries_adult_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_entries" DROP CONSTRAINT "digestive_symptom_entries_corrected_from_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_food_links" DROP CONSTRAINT "digestive_symptom_food_links_food_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_food_links" DROP CONSTRAINT "digestive_symptom_food_links_meal_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_food_links" DROP CONSTRAINT "digestive_symptom_food_links_symptom_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_meal_links" DROP CONSTRAINT "digestive_symptom_meal_links_meal_id_fkey";

-- DropForeignKey
ALTER TABLE "digestive_symptom_meal_links" DROP CONSTRAINT "digestive_symptom_meal_links_symptom_id_fkey";

-- DropForeignKey
ALTER TABLE "measurement_configurations" DROP CONSTRAINT "measurement_configurations_adult_profile_id_fkey";

-- AlterTable
ALTER TABLE "ai_generation_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "body_measurement_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "body_weight_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "custom_measurement_definitions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "digestive_symptom_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "digestive_symptom_food_links" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "digestive_symptom_meal_links" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "measurement_configurations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nutrition_goal_reviews" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "body_weight_entries" ADD CONSTRAINT "body_weight_entries_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_weight_entries" ADD CONSTRAINT "body_weight_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "body_weight_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurement_entries" ADD CONSTRAINT "body_measurement_entries_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurement_entries" ADD CONSTRAINT "body_measurement_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "body_measurement_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_configurations" ADD CONSTRAINT "measurement_configurations_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_measurement_definitions" ADD CONSTRAINT "custom_measurement_definitions_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "measurement_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_entries" ADD CONSTRAINT "digestive_symptom_entries_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_entries" ADD CONSTRAINT "digestive_symptom_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "digestive_symptom_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_meal_links" ADD CONSTRAINT "digestive_symptom_meal_links_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "digestive_symptom_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_meal_links" ADD CONSTRAINT "digestive_symptom_meal_links_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_food_links" ADD CONSTRAINT "digestive_symptom_food_links_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "digestive_symptom_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_food_links" ADD CONSTRAINT "digestive_symptom_food_links_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digestive_symptom_food_links" ADD CONSTRAINT "digestive_symptom_food_links_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ai_generation_requests_household_id_proposal_type_status_reques" RENAME TO "ai_generation_requests_household_id_proposal_type_status_re_idx";

-- RenameIndex
ALTER INDEX "custom_measurement_definitions_configuration_id_normalized_name" RENAME TO "custom_measurement_definitions_configuration_id_normalized__key";

-- RenameIndex
ALTER INDEX "digestive_symptom_entries_corrected_from_idx" RENAME TO "digestive_symptom_entries_corrected_from_id_idx";

-- RenameIndex
ALTER INDEX "digestive_symptom_entries_profile_intensity_start_idx" RENAME TO "digestive_symptom_entries_adult_profile_id_intensity_start__idx";

-- RenameIndex
ALTER INDEX "digestive_symptom_entries_profile_status_start_idx" RENAME TO "digestive_symptom_entries_adult_profile_id_status_start_at_idx";

-- RenameIndex
ALTER INDEX "digestive_symptom_entries_profile_type_start_idx" RENAME TO "digestive_symptom_entries_adult_profile_id_type_start_at_idx";

-- RenameIndex
ALTER INDEX "digestive_symptom_food_links_unique_idx" RENAME TO "digestive_symptom_food_links_symptom_id_food_id_meal_id_sou_key";
