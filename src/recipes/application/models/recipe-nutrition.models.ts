import Decimal from 'decimal.js';
import {
  BaseFoodUnit,
  NutrientAmounts,
} from '../../../nutrition/domain/models/nutrition-engine.models';

export interface RecipeNutritionIngredient {
  ingredientId: string;
  foodId: string;
  baseQuantity: Decimal;
  baseUnit: BaseFoodUnit;
  nutrients: NutrientAmounts;
}

export interface RecipeNutritionWarning {
  ingredientId: string;
  foodId: string;
  code: 'NUTRIENTS_UNAVAILABLE';
  message: string;
}

export interface RecipeNutritionResult {
  recipeId: string;
  servings: number;
  ingredients: RecipeNutritionIngredient[];
  totalNutrients: NutrientAmounts;
  perServingNutrients: NutrientAmounts;
  warnings: RecipeNutritionWarning[];
}
