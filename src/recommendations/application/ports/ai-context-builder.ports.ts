import type {
  FoodSubstitutionContext,
  RecipeSuggestionContext,
  WeeklyPlanGenerationContext,
} from './ai-generation.ports';

export const WEEKLY_PLAN_CONTEXT_BUILDER = Symbol('WeeklyPlanContextBuilder');
export const RECIPE_SUGGESTION_CONTEXT_BUILDER = Symbol('RecipeSuggestionContextBuilder');

export interface WeeklyPlanContextBuilder {
  build(input: {
    householdId: string;
    adultProfileIds: string[];
    weekStart: string;
    mealTypes: string[];
    preferences: Record<string, unknown>;
  }): Promise<WeeklyPlanGenerationContext>;
}

export interface RecipeSuggestionContextBuilder {
  build(input: {
    householdId: string;
    adultProfileIds: string[];
    mealType: string;
    maximumPreparationMinutes: number | null;
    maximumSuggestions: number;
    prioritizeExpiringInventory: boolean;
  }): Promise<RecipeSuggestionContext>;
}

export type FoodSubstitutionContextBuilder = {
  build(input: Record<string, unknown>): Promise<FoodSubstitutionContext>;
};
