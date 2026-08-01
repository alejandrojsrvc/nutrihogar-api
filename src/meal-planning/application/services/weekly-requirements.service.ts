import Decimal from 'decimal.js';
import type { Recipe } from '../../../recipes/domain/entities/recipe';
import { participantQuantity } from './quantity-suggestion.service';
import type { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { PlannedMealStatus } from '../../domain/value-objects/planned-meal';

export interface WeeklyRequirement {
  foodId: string;
  name: string;
  unit: string;
  required: string;
}

export interface WeeklyRequirementsResult {
  items: WeeklyRequirement[];
  warnings: string[];
}

export function calculateWeeklyRequirements(
  plan: WeeklyPlan,
  recipes: Map<string, Recipe | null>,
): WeeklyRequirementsResult {
  const totals = new Map<string, { foodId: string; unit: string; quantity: Decimal }>();
  const warnings: string[] = [];
  for (const meal of plan.meals) {
    if (![PlannedMealStatus.PLANNED, PlannedMealStatus.PREPARED].includes(meal.status)) continue;
    if (!meal.recipeId) continue;
    const recipe = recipes.get(meal.recipeId);
    if (!recipe || recipe.status !== 'ACTIVE') continue;
    for (const ingredient of recipe.ingredients) {
      if (ingredient.unit === 'SERVING') {
        warnings.push(
          `Ingredient ${ingredient.foodId} in meal ${meal.id} uses unsupported SERVING conversion.`,
        );
        continue;
      }
      for (const participant of meal.participants) {
        const quantity = participantQuantity(participant);
        if (!quantity) continue;
        const portions = quantity.quantity.div(recipe.defaultServings);
        const amount = ingredient.quantity
          .times(portions)
          .toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
        const key = `${ingredient.foodId}|${ingredient.unit}`;
        const current = totals.get(key);
        totals.set(key, {
          foodId: ingredient.foodId,
          unit: ingredient.unit,
          quantity: current ? current.quantity.plus(amount) : amount,
        });
      }
    }
  }
  return {
    items: [...totals.values()]
      .sort((left, right) =>
        `${left.foodId}|${left.unit}`.localeCompare(`${right.foodId}|${right.unit}`),
      )
      .map((item) => ({
        foodId: item.foodId,
        name: item.foodId,
        unit: item.unit,
        required: item.quantity.toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toString(),
      })),
    warnings: [...new Set(warnings)].sort(),
  };
}
