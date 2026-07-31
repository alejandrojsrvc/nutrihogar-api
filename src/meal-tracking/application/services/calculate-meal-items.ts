import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { MealItemInput } from '../ports/meal-repository.port';

export interface MealItemCommand {
  foodId: string;
  quantity: number | string;
  unit: 'GRAM' | 'MILLILITER' | 'UNIT' | 'SERVING';
  servingId?: string;
  measurementMethod: 'WEIGHED' | 'SERVING' | 'UNIT' | 'APPROXIMATED';
}

export async function calculateMealItems(
  nutritionEngine: NutritionEngineService,
  context: { actorId: string; householdId: string },
  items: MealItemCommand[],
): Promise<MealItemInput[]> {
  return Promise.all(
    items.map(async (item) => {
      const calculation = await nutritionEngine.calculate({
        actorId: context.actorId,
        householdId: context.householdId,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        servingId: item.servingId,
      });

      return {
        foodId: item.foodId,
        foodServingId: item.servingId,
        nameSnapshot: calculation.foodName ?? item.foodId,
        brandSnapshot: calculation.foodBrand ?? null,
        preparationStateSnapshot: calculation.preparationState ?? 'NOT_APPLICABLE',
        quantity: new Decimal(item.quantity),
        unit: item.unit,
        baseQuantity: calculation.baseQuantity,
        baseUnit: calculation.baseUnit,
        measurementMethod: item.measurementMethod,
        confidenceLevel: calculation.confidenceLevel ?? 'USER_PROVIDED',
        nutrients: Object.entries(calculation.nutrients).map(([code, amount]) => ({
          code,
          name: calculation.nutrientMetadata[code]?.name ?? code,
          unit: calculation.nutrientMetadata[code]?.unit ?? calculation.baseUnit,
          amount,
        })),
      };
    }),
  );
}
