import { createHash } from 'node:crypto';
import type {
  AiAdultContext,
  AiContextMap,
  AiInventoryContextItem,
  AiRecipeContextItem,
  WeeklyPlanGenerationContext,
} from '../ports/ai-generation.ports';

export interface WeeklyPlanContextHousehold {
  preferences: AiContextMap;
  weeklyBudget: number | null;
  currency: string;
  timezone: string;
  locale: string;
}

export type WeeklyPlanContextAdult = AiAdultContext;

export type WeeklyPlanContextInventoryItem = AiInventoryContextItem;

export type WeeklyPlanContextRecipe = AiRecipeContextItem;

export interface WeeklyPlanContextPlanning {
  mealSlots: string[];
  recentMealHistory: AiContextMap[];
  excludedFoods: string[];
}

export interface WeeklyPlanContextSources {
  households: {
    findById(householdId: string): Promise<WeeklyPlanContextHousehold | null>;
  };
  adults: {
    listByHousehold(
      householdId: string,
      adultProfileIds?: string[],
    ): Promise<WeeklyPlanContextAdult[]>;
  };
  inventory: {
    listActiveByHousehold(householdId: string): Promise<WeeklyPlanContextInventoryItem[]>;
  };
  recipes: {
    listActiveByHousehold(householdId: string): Promise<WeeklyPlanContextRecipe[]>;
  };
  planning: {
    getContext(householdId: string): Promise<WeeklyPlanContextPlanning>;
  };
}

export interface BuildWeeklyPlanContextInput {
  householdId: string;
  adultProfileIds?: string[];
  maxInventoryItems?: number;
  maxRecipes?: number;
}

export class WeeklyPlanGenerationContextBuilder {
  constructor(private readonly sources: WeeklyPlanContextSources) {}

  async build(input: BuildWeeklyPlanContextInput): Promise<WeeklyPlanGenerationContext> {
    const householdId = required(input.householdId, 'Household id');
    const household = await this.sources.households.findById(householdId);
    if (!household) throw new Error('Household context was not found.');

    const [adults, inventory, recipes, planning] = await Promise.all([
      this.sources.adults.listByHousehold(householdId, input.adultProfileIds),
      this.sources.inventory.listActiveByHousehold(householdId),
      this.sources.recipes.listActiveByHousehold(householdId),
      this.sources.planning.getContext(householdId),
    ]);
    const context = {
      schemaVersion: 'v1',
      householdPreferences: { ...household.preferences },
      adultNutritionTargets: adults.map(copyAdult),
      adultRestrictions: Object.fromEntries(
        adults.map((adult) => [adult.opaqueId, [...adult.restrictions]]),
      ),
      availableRecipes: limitRecipes(recipes, input.maxRecipes ?? 100),
      availableInventory: limitInventory(inventory, input.maxInventoryItems ?? 100),
      weeklyBudget: household.weeklyBudget,
      mealSlots: [...planning.mealSlots],
      recentMealHistory: planning.recentMealHistory.map((item) => ({ ...item })),
      excludedFoods: [...planning.excludedFoods],
      locale: household.locale,
      timezone: household.timezone,
    } satisfies Omit<WeeklyPlanGenerationContext, 'contextVersion'>;
    const contextVersion = hashContext(context);

    return { ...context, contextVersion };
  }
}

function limitInventory(
  items: WeeklyPlanContextInventoryItem[],
  limit: number,
): WeeklyPlanContextInventoryItem[] {
  return [...items]
    .sort((left, right) => {
      const leftExpiry = left.expiresAt ?? '9999-12-31';
      const rightExpiry = right.expiresAt ?? '9999-12-31';
      return (
        leftExpiry.localeCompare(rightExpiry) || left.opaqueFoodId.localeCompare(right.opaqueFoodId)
      );
    })
    .slice(0, positiveLimit(limit))
    .map((item) => ({ ...item }));
}

function limitRecipes(
  recipes: WeeklyPlanContextRecipe[],
  limit: number,
): WeeklyPlanContextRecipe[] {
  return [...recipes]
    .sort((left, right) => left.opaqueRecipeId.localeCompare(right.opaqueRecipeId))
    .slice(0, positiveLimit(limit))
    .map((recipe) => ({ ...recipe, ingredientFoodIds: [...recipe.ingredientFoodIds] }));
}

function copyAdult(adult: WeeklyPlanContextAdult): WeeklyPlanContextAdult {
  return {
    ...adult,
    nutritionTargets: adult.nutritionTargets ? { ...adult.nutritionTargets } : null,
    restrictions: [...adult.restrictions],
    preferences: [...adult.preferences],
    preferredMealTypes: [...adult.preferredMealTypes],
    referenceQuantities: { ...adult.referenceQuantities },
  };
}

function hashContext(value: object): string {
  return `v1:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function positiveLimit(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 1;
}
