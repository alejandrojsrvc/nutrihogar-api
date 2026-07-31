import { NutritionCalculation } from '../../../nutrition/domain/models/nutrition-engine.models';
import {
  PreparedBatchIngredientProps,
  PreparedBatchNutritionSnapshotInput,
} from '../../domain/models/prepared-batch.models';
import { PreparedBatchSnapshotMismatchError } from '../../domain/errors/prepared-batch.errors';

export function toPreparedBatchNutritionSnapshots(
  ingredients: PreparedBatchIngredientProps[],
  calculations: NutritionCalculation[],
): PreparedBatchNutritionSnapshotInput[] {
  return ingredients.map((ingredient, index) => {
    const calculation = calculations[index];
    if (!calculation || calculation.foodId !== ingredient.foodId) {
      throw new PreparedBatchSnapshotMismatchError();
    }

    return {
      ingredientId: ingredient.id,
      foodId: ingredient.foodId,
      foodName: calculation.foodName ?? null,
      foodBrand: calculation.foodBrand ?? null,
      preparationState: calculation.preparationState ?? null,
      confidenceLevel: calculation.confidenceLevel ?? null,
      baseQuantity: calculation.baseQuantity,
      baseUnit: calculation.baseUnit,
      nutrients: Object.entries(calculation.nutrients).map(([code, amount]) => ({
        code,
        name: calculation.nutrientMetadata[code]?.name ?? code,
        unit: calculation.nutrientMetadata[code]?.unit ?? calculation.baseUnit,
        amount,
      })),
    };
  });
}
