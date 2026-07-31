import { MealView } from '../../domain/models/meal.models';
import { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';

export const DAILY_NUTRITION_SUMMARY_REPOSITORY = Symbol('DailyNutritionSummaryRepository');

export interface DailyNutritionProfile {
  id: string;
  name: string;
  householdId: string;
  timezone: string;
}

export interface DailyNutritionSummaryData {
  meals: MealView[];
  goal: NutritionGoalView | null;
}

export interface DailyNutritionSummaryRepository {
  findAccessibleProfile(actorId: string, profileId: string): Promise<DailyNutritionProfile | null>;
  findByProfileAndRange(
    profileId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<DailyNutritionSummaryData>;
}
