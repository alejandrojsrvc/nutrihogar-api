import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FoodNotAvailableError } from '../../../nutrition/application/errors/food-not-available.error';
import {
  FoodServingNotFoundError,
  FoodUnitMismatchError,
  IncompleteServingEquivalenceError,
  InvalidFoodQuantityError,
} from '../../../nutrition/domain/errors/nutrition-engine.errors';
import { EmptyMealError, InvalidMealDateError } from '../../domain/errors/meal.errors';
import {
  MealAccessDeniedError,
  MealProfileNotFoundError,
} from '../../application/errors/meal-application.errors';
import { MealView } from '../../domain/models/meal.models';
import { MealResponseDto } from './dto/meal-response.dto';

export function toMealResponse(meal: MealView): MealResponseDto {
  const totals: Record<string, number> = {};
  const items = meal.items.map((item) => ({
    id: item.id,
    foodId: item.foodId,
    foodServingId: item.foodServingId,
    nameSnapshot: item.nameSnapshot,
    brandSnapshot: item.brandSnapshot,
    preparationStateSnapshot: item.preparationStateSnapshot,
    quantity: item.quantity.toNumber(),
    unit: item.unit,
    baseQuantity: item.baseQuantity.toNumber(),
    baseUnit: item.baseUnit,
    measurementMethod: item.measurementMethod,
    confidenceLevel: item.confidenceLevel,
    nutrients: item.nutrients.map((nutrient) => {
      totals[nutrient.nutrientCode] =
        (totals[nutrient.nutrientCode] ?? 0) + nutrient.amount.toNumber();
      return {
        code: nutrient.nutrientCode,
        name: nutrient.nutrientName,
        unit: nutrient.unit,
        amount: nutrient.amount.toNumber(),
      };
    }),
  }));

  return {
    id: meal.id,
    householdId: meal.householdId,
    adultProfileId: meal.adultProfileId,
    mealType: meal.mealType,
    consumedAt: meal.consumedAt,
    status: meal.status,
    source: meal.source,
    notes: meal.notes,
    totals,
    items,
  };
}

export function rethrowMealHttpError(error: unknown): never {
  if (
    error instanceof EmptyMealError ||
    error instanceof InvalidMealDateError ||
    error instanceof InvalidFoodQuantityError ||
    error instanceof FoodUnitMismatchError ||
    error instanceof FoodServingNotFoundError ||
    error instanceof IncompleteServingEquivalenceError
  ) {
    throw new BadRequestException(error.message);
  }
  if (error instanceof MealAccessDeniedError) throw new ForbiddenException(error.message);
  if (error instanceof MealProfileNotFoundError || error instanceof FoodNotAvailableError) {
    throw new NotFoundException(error.message);
  }

  throw error;
}
