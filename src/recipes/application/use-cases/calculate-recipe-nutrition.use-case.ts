import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { RecipeNotFoundError } from '../errors/recipe-application.errors';
import { resolveRecipeAccessContext } from '../services/resolve-recipe-access';
import {
  RecipeNutritionIngredient,
  RecipeNutritionResult,
  RecipeNutritionWarning,
} from '../models/recipe-nutrition.models';

export const CALCULATE_RECIPE_NUTRITION_USE_CASE = Symbol('CalculateRecipeNutritionUseCase');

export class CalculateRecipeNutritionUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
    private readonly nutritionEngine: NutritionEngineService,
  ) {}

  async execute(actorId: string, recipeId: string): Promise<RecipeNutritionResult> {
    const recipe = await this.recipes.findById(recipeId);
    if (!recipe) throw new RecipeNotFoundError();

    const { householdId } = await resolveRecipeAccessContext(this.households, actorId, recipe);

    const calculation = await this.nutritionEngine.calculateMany(
      recipe.ingredients.map((ingredient) => ({
        actorId,
        householdId,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servingId: ingredient.servingId ?? undefined,
      })),
    );

    const ingredients: RecipeNutritionIngredient[] = recipe.ingredients.map(
      (ingredient, index) => ({
        ingredientId: ingredient.id,
        foodId: ingredient.foodId,
        baseQuantity: calculation.items[index].baseQuantity,
        baseUnit: calculation.items[index].baseUnit,
        nutrients: calculation.items[index].nutrients,
      }),
    );
    const warnings: RecipeNutritionWarning[] = ingredients.flatMap((ingredient) =>
      Object.keys(ingredient.nutrients).length > 0
        ? []
        : [
            {
              ingredientId: ingredient.ingredientId,
              foodId: ingredient.foodId,
              code: 'NUTRIENTS_UNAVAILABLE',
              message: 'No nutritional data is available for this ingredient.',
            },
          ],
    );

    return {
      recipeId: recipe.id,
      servings: recipe.defaultServings,
      ingredients,
      totalNutrients: calculation.nutrients,
      perServingNutrients: divideNutrients(calculation.nutrients, recipe.defaultServings),
      warnings,
    };
  }
}

function divideNutrients(nutrients: Record<string, Decimal>, servings: number) {
  const divisor = new Decimal(servings);
  return Object.fromEntries(
    Object.entries(nutrients).map(([code, amount]) => [code, amount.div(divisor)]),
  );
}
