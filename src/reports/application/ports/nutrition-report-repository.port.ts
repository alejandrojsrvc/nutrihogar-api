import type { MealView } from '../../../meal-tracking/domain/models/meal.models';
import type { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';
import type { WeeklyPlan } from '../../../meal-planning/domain/entities/weekly-plan';

export const NUTRITION_REPORT_REPOSITORY = Symbol('NutritionReportRepository');

export interface NutritionReportProfile {
  id: string;
  name: string;
  householdId: string;
  timezone: string;
}

export interface NutritionReportRepository {
  findAccessibleProfile(actorId: string, profileId: string): Promise<NutritionReportProfile | null>;
  listMeals(profileId: string, dateFrom: Date, dateTo: Date): Promise<MealView[]>;
  listGoals(profileId: string): Promise<NutritionGoalView[]>;
  findPlan(householdId: string, weekStart: Date): Promise<WeeklyPlan | null>;
  listBodyWeights(
    profileId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<Array<{ value: number; unit: string; recordedAt: Date }>>;
  countSymptoms(profileId: string, dateFrom: Date, dateTo: Date): Promise<number>;
}
