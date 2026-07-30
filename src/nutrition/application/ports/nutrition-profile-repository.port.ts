import {
  NutritionActivityLevel,
  NutritionBiologicalSex,
  NutritionPrimaryGoal,
} from '../../domain/services/nutrition-goal-calculator';

export const NUTRITION_PROFILE_REPOSITORY = Symbol('NutritionProfileRepository');

export interface NutritionCalculationProfile {
  id: string;
  birthDate: Date;
  biologicalSex: NutritionBiologicalSex;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: NutritionActivityLevel;
  primaryGoal: NutritionPrimaryGoal;
}

export interface NutritionProfileRepository {
  findActiveById(profileId: string): Promise<NutritionCalculationProfile | null>;
}
