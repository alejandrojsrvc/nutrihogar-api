import {
  NutritionCalculation,
  PresentedNutritionCalculation,
} from '../domain/models/nutrition-engine.models';

export class NutritionCalculationPresenter {
  static present(
    calculation: NutritionCalculation,
    decimalPlaces = 2,
  ): PresentedNutritionCalculation {
    return {
      baseQuantity: calculation.baseQuantity.toDecimalPlaces(decimalPlaces).toNumber(),
      baseUnit: calculation.baseUnit,
      nutrients: Object.fromEntries(
        Object.entries(calculation.nutrients).map(([code, amount]) => [
          code,
          amount.toDecimalPlaces(decimalPlaces).toNumber(),
        ]),
      ),
    };
  }
}
