import crypto from 'node:crypto';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { RecipeArchivedError } from '../../domain/errors/recipe.errors';
import { RecipeNotFoundError } from '../errors/recipe-application.errors';
import { RecipeAccessDeniedError } from '../errors/recipe-application.errors';
import { StartPreparedBatchCommand } from '../models/prepared-batch-command.models';
import { ensureRecipeFoodsVisible } from '../services/ensure-recipe-foods';

export const START_PREPARED_BATCH_USE_CASE = Symbol('StartPreparedBatchUseCase');

export class StartPreparedBatchUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly nutritionEngine: NutritionEngineService,
    private readonly clock: Clock,
  ) {}

  async execute(command: StartPreparedBatchCommand) {
    const recipe = await this.recipes.findById(command.recipeId);
    if (!recipe) throw new RecipeNotFoundError();
    if (recipe.status === 'ARCHIVED') throw new RecipeArchivedError();

    const access = await this.households.findAccess(command.actorId, recipe.householdId);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();
    await ensureRecipeFoodsVisible(
      this.nutritionEngine,
      command.actorId,
      recipe.householdId,
      recipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity.toString(),
        unit: ingredient.unit,
        servingId: ingredient.servingId,
        position: ingredient.position,
        notes: ingredient.notes,
      })),
    );

    const now = this.clock.now();
    const batch = PreparedBatch.start({
      id: crypto.randomUUID(),
      householdId: recipe.householdId,
      recipeId: recipe.id,
      recipeNameSnapshot: recipe.name,
      preparedAt: command.preparedAt ?? now,
      createdById: command.actorId,
      createdAt: now,
      updatedAt: now,
      ingredients: recipe.ingredients.map((ingredient) => ({
        id: crypto.randomUUID(),
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servingId: ingredient.servingId,
        position: ingredient.position,
        notes: ingredient.notes,
        foodNameSnapshot: null,
        brandSnapshot: null,
        preparationStateSnapshot: null,
        confidenceLevel: null,
        baseQuantity: null,
        baseUnit: null,
        nutrients: [],
      })),
    });
    await this.batches.save(batch);
    return batch;
  }
}
