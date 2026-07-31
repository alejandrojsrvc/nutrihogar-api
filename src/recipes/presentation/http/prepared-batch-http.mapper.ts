import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FoodNotAvailableError } from '../../../nutrition/application/errors/food-not-available.error';
import {
  FoodServingNotFoundError,
  FoodUnitMismatchError,
  IncompleteServingEquivalenceError,
  InvalidFoodQuantityError,
} from '../../../nutrition/domain/errors/nutrition-engine.errors';
import {
  RecipeAccessDeniedError,
  RecipeNotFoundError,
} from '../../application/errors/recipe-application.errors';
import {
  PreparedBatchAccessDeniedError,
  PreparedBatchNotFoundError,
} from '../../application/errors/prepared-batch-application.errors';
import {
  InvalidPreparedBatchCookedWeightError,
  InvalidPreparedBatchIngredientError,
  PreparedBatchAlreadyFinalizedError,
  PreparedBatchCancelledError,
  PreparedBatchIngredientsRequiredError,
  PreparedBatchNotConfirmableError,
  PreparedBatchNotDraftError,
  PreparedBatchSnapshotMismatchError,
} from '../../domain/errors/prepared-batch.errors';
import { RecipeArchivedError } from '../../domain/errors/recipe.errors';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import type { PreparedBatchNutritionWarning } from '../../application/models/prepared-batch-command.models';
import { PreparedBatchResponseDto } from './dto/prepared-batch-response.dto';

export function toPreparedBatchResponse(
  batch: PreparedBatch,
  warnings: PreparedBatchNutritionWarning[] = [],
  preservePrecision = false,
): PreparedBatchResponseDto {
  return {
    id: batch.id,
    householdId: batch.householdId,
    recipeId: batch.recipeId,
    recipeNameSnapshot: batch.recipeNameSnapshot,
    preparedAt: batch.preparedAt,
    status: batch.status,
    ingredients: batch.ingredients.map((ingredient) => ({
      id: ingredient.id,
      foodId: ingredient.foodId,
      servingId: ingredient.servingId,
      quantity: toResponseNumber(ingredient.quantity, preservePrecision, 2),
      unit: ingredient.unit,
      position: ingredient.position,
      notes: ingredient.notes,
      foodNameSnapshot: ingredient.foodNameSnapshot,
      brandSnapshot: ingredient.brandSnapshot,
      preparationStateSnapshot: ingredient.preparationStateSnapshot,
      confidenceLevel: ingredient.confidenceLevel ?? null,
      baseQuantity: ingredient.baseQuantity
        ? toResponseNumber(ingredient.baseQuantity, preservePrecision, 2)
        : null,
      baseUnit: ingredient.baseUnit,
      nutrients: toNutrientMap(ingredient.nutrients),
    })),
    totalNutrients: toNutrientMap(batch.totalNutrients, preservePrecision),
    finalCookedWeight: batch.finalCookedWeight
      ? toResponseNumber(batch.finalCookedWeight, preservePrecision, 2)
      : null,
    nutrientsPerGram: nutrientsToResponse(batch.nutrientsPerGram, preservePrecision),
    nutrientsPer100Grams: nutrientsToResponse(batch.nutrientsPer100Grams, preservePrecision),
    warnings,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    finalizedAt: batch.finalizedAt,
    cancelledAt: batch.cancelledAt,
  };
}

export function rethrowPreparedBatchHttpError(error: unknown): never {
  if (
    error instanceof InvalidPreparedBatchIngredientError ||
    error instanceof PreparedBatchIngredientsRequiredError ||
    error instanceof InvalidPreparedBatchCookedWeightError ||
    error instanceof PreparedBatchSnapshotMismatchError ||
    error instanceof InvalidFoodQuantityError ||
    error instanceof FoodUnitMismatchError ||
    error instanceof FoodServingNotFoundError ||
    error instanceof IncompleteServingEquivalenceError
  ) {
    throw new BadRequestException(error.message);
  }
  if (
    error instanceof PreparedBatchNotDraftError ||
    error instanceof PreparedBatchNotConfirmableError ||
    error instanceof PreparedBatchAlreadyFinalizedError ||
    error instanceof PreparedBatchCancelledError ||
    error instanceof RecipeArchivedError
  ) {
    throw new ConflictException(error.message);
  }
  if (error instanceof PreparedBatchAccessDeniedError || error instanceof RecipeAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }
  if (
    error instanceof PreparedBatchNotFoundError ||
    error instanceof RecipeNotFoundError ||
    error instanceof FoodNotAvailableError
  ) {
    throw new NotFoundException(error.message);
  }

  throw error;
}

function toNutrientMap(
  nutrients: Array<{
    code: string;
    amount: { toDecimalPlaces: (places: number) => { toNumber: () => number } };
  }>,
  preservePrecision: boolean,
) {
  return Object.fromEntries(
    nutrients.map((nutrient) => [
      nutrient.code,
      toResponseNumber(nutrient.amount, preservePrecision, 4),
    ]),
  );
}

function nutrientsToResponse(
  nutrients: Record<
    string,
    { toDecimalPlaces: (places: number) => { toNumber: () => number } }
  > | null,
  preservePrecision: boolean,
) {
  if (!nutrients) return {};
  return Object.fromEntries(
    Object.entries(nutrients).map(([code, amount]) => [
      code,
      toResponseNumber(amount, preservePrecision, 6),
    ]),
  );
}

function toResponseNumber(
  amount: {
    toNumber: () => number;
    toDecimalPlaces: (places: number) => { toNumber: () => number };
  },
  preservePrecision: boolean,
  places: number,
): number {
  return preservePrecision ? amount.toNumber() : amount.toDecimalPlaces(places).toNumber();
}
