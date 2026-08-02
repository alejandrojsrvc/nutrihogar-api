import { NutritionGoalView } from '../../domain/models/nutrition-goal.models';
import { NutritionGoalReviewData } from '../../domain/models/nutrition-goal-review.models';
import { NutritionGoalReviewInput } from '../../domain/services/nutrition-goal-review-evaluator';

export function reviewInput(
  goal: NutritionGoalView,
  data: NutritionGoalReviewData,
  date: Date,
): NutritionGoalReviewInput {
  const primaryGoalValue = goal.calculationInput.primaryGoal;
  const primaryGoal = (typeof primaryGoalValue === 'string' ? primaryGoalValue : '').toUpperCase();
  const expectedWeeklyWeightChangeKg =
    primaryGoal === 'FAT_LOSS' ? '-0.5' : primaryGoal === 'MUSCLE_GAIN' ? '0.25' : '0';
  return {
    evaluationDate: date,
    activeGoal: {
      startedAt: goal.validFrom,
      expiresAt: goal.validUntil,
      expectedWeeklyWeightChangeKg,
    },
    initialWeight: data.initialWeight,
    recentWeights: data.recentWeights,
    recentMeasurements: data.recentMeasurements,
    calorieAdherence: data.calorieAdherence,
    proteinAdherence: data.proteinAdherence,
    trackingDays: data.trackingDays,
    activityLevelChanged: data.activityLevelChanged,
    profileDataChanged: data.profileDataChanged,
  };
}

export function isTerminal(action: string | null): boolean {
  return action === 'ACCEPTED' || action === 'REJECTED';
}
