import crypto from 'node:crypto';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { InvalidPreparedBatchIngredientError } from '../../domain/errors/prepared-batch.errors';
import { PreparedBatchIngredientCommand } from '../models/prepared-batch-command.models';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { findAccessiblePreparedBatch } from '../services/ensure-prepared-batch-access';
import { ensureRecipeFoodsVisible } from '../services/ensure-recipe-foods';

export const UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE = Symbol(
  'UpdatePreparedBatchIngredientsUseCase',
);

export class UpdatePreparedBatchIngredientsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly nutritionEngine: NutritionEngineService,
  ) {}

  async execute(command: {
    actorId: string;
    batchId: string;
    ingredients: PreparedBatchIngredientCommand[];
  }) {
    const batch = await findAccessiblePreparedBatch(
      command.actorId,
      command.batchId,
      this.households,
      this.batches,
    );
    const existingIds = new Set(batch.ingredients.map((ingredient) => ingredient.id));
    if (
      command.ingredients.some((ingredient) => ingredient.id && !existingIds.has(ingredient.id))
    ) {
      throw new InvalidPreparedBatchIngredientError();
    }
    await ensureRecipeFoodsVisible(
      this.nutritionEngine,
      command.actorId,
      batch.householdId,
      command.ingredients,
    );

    batch.replaceIngredients(command.ingredients.map(toDomainIngredient));
    await this.batches.save(batch);
    return batch;
  }
}

function toDomainIngredient(ingredient: PreparedBatchIngredientCommand) {
  return {
    id: ingredient.id ?? crypto.randomUUID(),
    foodId: ingredient.foodId,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    servingId: ingredient.servingId ?? null,
    position: ingredient.position,
    notes: ingredient.notes ?? null,
    foodNameSnapshot: null,
    brandSnapshot: null,
    preparationStateSnapshot: null,
    confidenceLevel: null,
    baseQuantity: null,
    baseUnit: null,
    nutrients: [],
  };
}
