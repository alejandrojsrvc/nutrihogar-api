import Decimal from 'decimal.js';
import {
  FoodServingNotFoundError,
  FoodUnitMismatchError,
  IncompleteServingEquivalenceError,
  InvalidFoodQuantityError,
} from '../errors/nutrition-engine.errors';
import {
  BaseFoodQuantity,
  FoodConsumptionInput,
  FoodServingData,
  NutritionFoodData,
} from '../models/nutrition-engine.models';

export class UnitConverter {
  toBaseQuantity(food: NutritionFoodData, input: FoodConsumptionInput): BaseFoodQuantity {
    const quantity = positiveDecimal(input.quantity);

    if (input.unit !== 'SERVING') {
      if (input.unit !== food.referenceUnit) throw new FoodUnitMismatchError();
      return { quantity, unit: food.referenceUnit };
    }

    const serving = food.servings.find((candidate) => candidate.id === input.servingId);
    if (!serving) throw new FoodServingNotFoundError();

    const equivalent = this.getEquivalent(food, serving);
    return {
      quantity: equivalent.mul(quantity),
      unit: food.referenceUnit,
    };
  }

  private getEquivalent(food: NutritionFoodData, serving: FoodServingData): Decimal {
    const value =
      food.referenceUnit === 'GRAM'
        ? serving.equivalentGrams
        : food.referenceUnit === 'MILLILITER'
          ? serving.equivalentMilliliters
          : null;

    if (value === null || value === undefined) {
      throw new IncompleteServingEquivalenceError();
    }

    try {
      const equivalent = new Decimal(value);
      if (!equivalent.isFinite() || equivalent.lte(0)) {
        throw new IncompleteServingEquivalenceError();
      }
      return equivalent;
    } catch (error) {
      if (error instanceof IncompleteServingEquivalenceError) throw error;
      throw new IncompleteServingEquivalenceError();
    }
  }
}

function positiveDecimal(value: Decimal.Value): Decimal {
  try {
    const decimal = new Decimal(value);
    if (!decimal.isFinite() || decimal.lte(0)) throw new InvalidFoodQuantityError();
    return decimal;
  } catch (error) {
    if (error instanceof InvalidFoodQuantityError) throw error;
    throw new InvalidFoodQuantityError();
  }
}
