import Decimal from 'decimal.js';
import type { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';
import type {
  PlannedMealProps,
  PlannedMealParticipantProps,
} from '../../domain/models/meal-planning.models';

export interface QuantitySuggestion {
  participantId: string;
  adultProfileId: string;
  quantity: string;
  unit: string;
  goalValidFrom: Date;
  targetCalories: string;
}

const mealShares: Record<string, Decimal> = {
  BREAKFAST: new Decimal('0.25'),
  LUNCH: new Decimal('0.35'),
  SNACK: new Decimal('0.10'),
  DINNER: new Decimal('0.30'),
  EXTRA: new Decimal('0.10'),
};

export function suggestQuantities(
  meal: PlannedMealProps,
  goals: Map<string, NutritionGoalView | null>,
): QuantitySuggestion[] {
  const mealCalories =
    snapshotNumber(meal.nutritionSnapshot, 'calories') ??
    snapshotNumber(meal.nutritionSnapshot, 'energyKcal');
  const caloriesPerServing = mealCalories && mealCalories.gt(0) ? mealCalories : new Decimal(1);
  const share = mealShares[meal.type] ?? mealShares.EXTRA;
  return meal.participants.flatMap((participant) => {
    const goal = goals.get(participant.adultProfileId);
    if (!goal) return [];
    const targetCalories = goal.values.calories.times(share);
    const quantity = targetCalories
      .div(caloriesPerServing)
      .toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
    return [
      {
        participantId: participant.id,
        adultProfileId: participant.adultProfileId,
        quantity: quantity.toString(),
        unit: 'SERVING',
        goalValidFrom: new Date(goal.validFrom),
        targetCalories: targetCalories.toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toString(),
      },
    ];
  });
}

function snapshotNumber(snapshot: Record<string, unknown> | null, key: string): Decimal | null {
  const value = snapshot?.[key];
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const decimal = new Decimal(value);
  return decimal.isFinite() ? decimal : null;
}

export function participantQuantity(
  participant: PlannedMealParticipantProps,
): { quantity: Decimal; unit: string } | null {
  if (participant.confirmedQuantity && participant.confirmedUnit)
    return {
      quantity: new Decimal(participant.confirmedQuantity),
      unit: participant.confirmedUnit,
    };
  if (participant.suggestedQuantity && participant.suggestedUnit)
    return {
      quantity: new Decimal(participant.suggestedQuantity),
      unit: participant.suggestedUnit,
    };
  return null;
}
