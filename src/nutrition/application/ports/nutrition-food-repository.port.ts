import { NutritionFoodData } from '../../domain/models/nutrition-engine.models';

export const NUTRITION_FOOD_REPOSITORY = Symbol('NutritionFoodRepository');

export interface FindVisibleNutritionFoodQuery {
  actorId: string;
  householdId: string;
  foodId: string;
}

export interface NutritionFoodRepository {
  findVisibleById(query: FindVisibleNutritionFoodQuery): Promise<NutritionFoodData | null>;
}
