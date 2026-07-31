import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { RecipeIngredientCommand } from '../models/recipe-command.models';

export async function ensureRecipeFoodsVisible(
  nutritionEngine: NutritionEngineService,
  actorId: string,
  householdId: string,
  ingredients: RecipeIngredientCommand[],
): Promise<void> {
  await Promise.all(
    ingredients.map((ingredient) =>
      nutritionEngine.calculate({
        actorId,
        householdId,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servingId: ingredient.servingId ?? undefined,
      }),
    ),
  );
}
