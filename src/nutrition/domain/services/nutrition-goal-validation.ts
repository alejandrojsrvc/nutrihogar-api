import Decimal from 'decimal.js';
import {
  InvalidNutritionGoalExpirationError,
  InvalidNutritionGoalMetadataError,
  InvalidNutritionGoalValuesError,
} from '../errors/nutrition-goal.errors';
import { NutritionValues } from '../models/nutrition-goal.models';

export interface NutritionValueInput {
  calories: Decimal.Value;
  proteinGrams: Decimal.Value;
  carbohydrateGrams: Decimal.Value;
  fatGrams: Decimal.Value;
  fiberGrams: Decimal.Value;
}

export function requiredNutritionGoalText(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidNutritionGoalMetadataError();
  return normalized;
}

export function createNutritionValues(input: NutritionValueInput): NutritionValues {
  return {
    calories: createPositiveDecimal(input.calories),
    proteinGrams: createPositiveDecimal(input.proteinGrams),
    carbohydrateGrams: createPositiveDecimal(input.carbohydrateGrams),
    fatGrams: createPositiveDecimal(input.fatGrams),
    fiberGrams: createPositiveDecimal(input.fiberGrams),
  };
}

export function ensureFutureExpiration(expiresAt: Date, now: Date): void {
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
    throw new InvalidNutritionGoalExpirationError();
  }
}

export function createPositiveDecimal(value: Decimal.Value): Decimal {
  try {
    const decimal = new Decimal(value);
    if (!decimal.isFinite() || decimal.lte(0)) throw new InvalidNutritionGoalValuesError();
    return decimal;
  } catch (error) {
    if (error instanceof InvalidNutritionGoalValuesError) throw error;
    throw new InvalidNutritionGoalValuesError();
  }
}
