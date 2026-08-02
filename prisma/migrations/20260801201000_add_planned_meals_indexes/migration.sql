-- CreateIndex
CREATE INDEX "planned_meals_recipe_id_idx" ON "planned_meals"("recipe_id");

-- CreateIndex
CREATE INDEX "planned_meals_replaced_meal_id_idx" ON "planned_meals"("replaced_meal_id");

-- CreateIndex
CREATE INDEX "planned_meals_prepared_batch_id_idx" ON "planned_meals"("prepared_batch_id");

-- CreateIndex
CREATE INDEX "planned_meals_meal_id_idx" ON "planned_meals"("meal_id");
