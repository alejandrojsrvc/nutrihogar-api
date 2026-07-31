import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatchNutritionWarning } from '../models/prepared-batch-command.models';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { findAccessiblePreparedBatch } from '../services/ensure-prepared-batch-access';
import { toPreparedBatchNutritionSnapshots } from '../services/to-prepared-batch-nutrition-snapshots';

export const CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE = Symbol(
  'ConfirmPreparedBatchIngredientsUseCase',
);

export class ConfirmPreparedBatchIngredientsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly nutritionEngine: NutritionEngineService,
    private readonly clock: Clock,
  ) {}

  async execute(actorId: string, batchId: string) {
    const batch = await findAccessiblePreparedBatch(
      actorId,
      batchId,
      this.households,
      this.batches,
    );
    const calculations = await this.nutritionEngine.calculateMany(
      batch.ingredients.map((ingredient) => ({
        actorId,
        householdId: batch.householdId,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servingId: ingredient.servingId ?? undefined,
      })),
    );
    const snapshots = toPreparedBatchNutritionSnapshots(batch.ingredients, calculations.items);
    const warnings: PreparedBatchNutritionWarning[] = batch.ingredients.flatMap(
      (ingredient, index) =>
        Object.keys(calculations.items[index]?.nutrients ?? {}).length > 0
          ? []
          : [
              {
                ingredientId: ingredient.id,
                foodId: ingredient.foodId,
                code: 'NUTRIENTS_UNAVAILABLE',
                message: 'No nutritional data is available for this ingredient.',
              },
            ],
    );

    batch.confirmIngredients(snapshots, this.clock.now());
    await this.batches.save(batch);
    return { batch, warnings };
  }
}
