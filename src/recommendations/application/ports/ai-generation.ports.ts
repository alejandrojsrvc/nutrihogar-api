import type { StructuredPayload } from '../../domain/models/ai-recommendation.models';

export const WEEKLY_PLAN_GENERATOR = Symbol('WeeklyPlanGenerator');
export const RECIPE_SUGGESTION_PROVIDER = Symbol('RecipeSuggestionProvider');
export const FOOD_SUBSTITUTION_PROVIDER = Symbol('FoodSubstitutionProvider');

export type AiContextScalar = string | number | boolean | null;
export type AiContextMap = Record<string, AiContextScalar>;

export interface AiProviderCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  correlationId?: string;
}

export interface AiNutritionTargets {
  calories: number | null;
  proteinGrams: number | null;
  carbohydrateGrams: number | null;
  fatGrams: number | null;
  fiberGrams: number | null;
}

export interface AiAdultContext {
  opaqueId: string;
  nutritionTargets: AiNutritionTargets | null;
  restrictions: string[];
  preferences: string[];
  preferredMealTypes: string[];
  referenceQuantities: AiContextMap;
}

export interface AiInventoryContextItem {
  opaqueFoodId: string;
  quantity: number;
  unit: string;
  preparationState: string;
  expiresAt: string | null;
  isPrepared: boolean;
}

export interface AiRecipeContextItem {
  opaqueRecipeId: string;
  name: string;
  ingredientFoodIds: string[];
  nutrition: AiContextMap;
  preparationMinutes: number | null;
  category: string | null;
}

export interface WeeklyPlanGenerationContext {
  schemaVersion: string;
  contextVersion: string;
  householdPreferences: AiContextMap;
  adultNutritionTargets: AiAdultContext[];
  adultRestrictions: Record<string, string[]>;
  availableRecipes: AiRecipeContextItem[];
  availableInventory: AiInventoryContextItem[];
  weeklyBudget: number | null;
  mealSlots: string[];
  recentMealHistory: AiContextMap[];
  excludedFoods: string[];
  locale: string;
  timezone: string;
}

export interface RecipeSuggestionContext {
  schemaVersion: string;
  contextVersion: string;
  mealType: string;
  adultProfiles: AiAdultContext[];
  availableInventory: AiInventoryContextItem[];
  existingRecipes: AiRecipeContextItem[];
  maximumPreparationMinutes: number | null;
  maximumSuggestions: number;
  prioritizeExpiringInventory: boolean;
  locale: string;
  timezone: string;
}

export interface FoodSubstitutionContext {
  schemaVersion: string;
  contextVersion: string;
  originalFoodId: string;
  recipeId: string | null;
  quantity: number;
  unit: string;
  reason: string;
  adultProfiles: AiAdultContext[];
  availableInventory: AiInventoryContextItem[];
  locale: string;
  timezone: string;
}

export interface AiProviderMetadata {
  provider: string;
  model: string;
  inputTokenCount?: number | null;
  outputTokenCount?: number | null;
  estimatedCost?: string | null;
  latencyMilliseconds?: number | null;
  correlationId?: string | null;
}

export interface AiGenerationResult<TPayload extends StructuredPayload = StructuredPayload> {
  schemaVersion: string;
  payload: TPayload;
  metadata: AiProviderMetadata;
}

export type WeeklyPlanGenerationResult = AiGenerationResult;
export type RecipeSuggestionResult = AiGenerationResult;
export type FoodSubstitutionResult = AiGenerationResult;

export interface WeeklyPlanGenerator {
  generate(
    context: WeeklyPlanGenerationContext,
    options?: AiProviderCallOptions,
  ): Promise<WeeklyPlanGenerationResult>;
}

export interface RecipeSuggestionProvider {
  suggest(
    context: RecipeSuggestionContext,
    options?: AiProviderCallOptions,
  ): Promise<RecipeSuggestionResult>;
}

export interface FoodSubstitutionProvider {
  suggestSubstitutions(
    context: FoodSubstitutionContext,
    options?: AiProviderCallOptions,
  ): Promise<FoodSubstitutionResult>;
}
