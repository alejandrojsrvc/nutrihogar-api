import Decimal from 'decimal.js';
import {
  NutritionValues,
  NutritionGoalView,
  NutritionGoalSuggestionView,
} from './nutrition-goal.models';
import {
  NutritionGoalReviewOutcome,
  NutritionGoalReviewReason,
} from '../services/nutrition-goal-review-evaluator';

export interface NutritionGoalReviewView {
  id: string;
  adultProfileId: string;
  outcome: NutritionGoalReviewOutcome;
  reasons: readonly NutritionGoalReviewReason[];
  evaluatedAt: Date;
  postponedUntil: Date | null;
  proposalSuggestionId: string | null;
  terminalAction: 'ACCEPTED' | 'REJECTED' | 'POSTPONED' | null;
  actedById: string | null;
  actedAt: Date | null;
}

export interface NutritionGoalReviewData {
  initialWeight: { recordedAt: Date; weightKg: Decimal.Value };
  recentWeights: Array<{ recordedAt: Date; weightKg: Decimal.Value }>;
  recentMeasurements: Array<{ recordedAt: Date; values: Record<string, Decimal.Value> }>;
  calorieAdherence: Decimal.Value;
  proteinAdherence: Decimal.Value;
  trackingDays: number;
  activityLevelChanged: boolean;
  profileDataChanged: boolean;
}

export interface NutritionGoalReviewResult {
  review: NutritionGoalReviewView;
  currentGoal: NutritionGoalView | null;
  proposal: NutritionGoalSuggestionView | null;
  differences: NutritionGoalDifferences | null;
}

export interface NutritionGoalDifferences {
  calories: Decimal;
  proteinGrams: Decimal;
  carbohydrateGrams: Decimal;
  fatGrams: Decimal;
  fiberGrams: Decimal;
}

export function differences(
  current: NutritionValues,
  proposal: NutritionValues,
): NutritionGoalDifferences {
  return {
    calories: proposal.calories.minus(current.calories),
    proteinGrams: proposal.proteinGrams.minus(current.proteinGrams),
    carbohydrateGrams: proposal.carbohydrateGrams.minus(current.carbohydrateGrams),
    fatGrams: proposal.fatGrams.minus(current.fatGrams),
    fiberGrams: proposal.fiberGrams.minus(current.fiberGrams),
  };
}
