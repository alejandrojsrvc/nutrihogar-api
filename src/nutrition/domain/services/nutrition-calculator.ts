import Decimal from 'decimal.js';
import { InvalidFoodReferenceError } from '../errors/nutrition-engine.errors';
import {
  BaseFoodQuantity,
  NutritionCalculation,
  NutritionFoodData,
} from '../models/nutrition-engine.models';

export class NutritionCalculator {
  calculate(food: NutritionFoodData, base: BaseFoodQuantity): NutritionCalculation {
    const referenceQuantity = this.referenceQuantity(food.referenceQuantity);
    const factor = base.quantity.div(referenceQuantity);
    const nutrients = Object.fromEntries(
      food.nutrients.map((nutrient) => [nutrient.code, new Decimal(nutrient.amount).mul(factor)]),
    );

    return {
      baseQuantity: base.quantity,
      baseUnit: base.unit,
      nutrients,
      nutrientMetadata: Object.fromEntries(
        food.nutrients.map((nutrient) => [
          nutrient.code,
          {
            name: nutrient.name ?? nutrient.code,
            unit: nutrient.unit ?? base.unit,
          },
        ]),
      ),
    };
  }

  private referenceQuantity(value: Decimal.Value): Decimal {
    try {
      const reference = new Decimal(value);
      if (!reference.isFinite() || reference.lte(0)) throw new InvalidFoodReferenceError();
      return reference;
    } catch (error) {
      if (error instanceof InvalidFoodReferenceError) throw error;
      throw new InvalidFoodReferenceError();
    }
  }
}
