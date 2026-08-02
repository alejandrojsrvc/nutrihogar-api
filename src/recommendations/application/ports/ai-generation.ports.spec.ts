import { AiProviderError } from '../errors/ai-provider.error';
import type {
  FoodSubstitutionContext,
  FoodSubstitutionProvider,
  RecipeSuggestionContext,
  RecipeSuggestionProvider,
  WeeklyPlanGenerationContext,
  WeeklyPlanGenerator,
} from './ai-generation.ports';

describe('AI generation ports', () => {
  it('supports provider replacements without importing a provider SDK', async () => {
    const weeklyPlan: WeeklyPlanGenerator = new FakeProvider();
    const recipe: RecipeSuggestionProvider = new FakeProvider();
    const substitution: FoodSubstitutionProvider = new FakeProvider();

    await expect(weeklyPlan.generate(weeklyContext())).resolves.toMatchObject({
      schemaVersion: 'v1',
      payload: { items: [] },
    });
    await expect(recipe.suggest(recipeContext())).resolves.toMatchObject({
      payload: { items: [] },
    });
    await expect(substitution.suggestSubstitutions(substitutionContext())).resolves.toMatchObject({
      payload: { items: [] },
    });
  });

  it('exposes normalized and retryable provider failures', () => {
    const error = new AiProviderError('AI_PROVIDER_TIMEOUT', 'Provider timed out.', true);

    expect(error).toMatchObject({
      name: 'AiProviderError',
      code: 'AI_PROVIDER_TIMEOUT',
      retryable: true,
    });
  });
});

class FakeProvider
  implements WeeklyPlanGenerator, RecipeSuggestionProvider, FoodSubstitutionProvider
{
  generate(context: WeeklyPlanGenerationContext) {
    void context;
    return Promise.resolve(result());
  }

  suggest(context: RecipeSuggestionContext) {
    void context;
    return Promise.resolve(result());
  }

  suggestSubstitutions(context: FoodSubstitutionContext) {
    void context;
    return Promise.resolve(result());
  }
}

function result() {
  return {
    schemaVersion: 'v1',
    payload: { items: [] },
    metadata: { provider: 'fake', model: 'fake-v1' },
  };
}

function weeklyContext(): WeeklyPlanGenerationContext {
  return {
    schemaVersion: 'v1',
    contextVersion: 'context-v1',
    householdPreferences: {},
    adultNutritionTargets: [],
    adultRestrictions: {},
    availableRecipes: [],
    availableInventory: [],
    weeklyBudget: null,
    mealSlots: [],
    recentMealHistory: [],
    excludedFoods: [],
    locale: 'es-AR',
    timezone: 'America/Argentina/Buenos_Aires',
  };
}

function recipeContext(): RecipeSuggestionContext {
  return {
    schemaVersion: 'v1',
    contextVersion: 'context-v1',
    mealType: 'DINNER',
    adultProfiles: [],
    availableInventory: [],
    existingRecipes: [],
    maximumPreparationMinutes: 40,
    maximumSuggestions: 3,
    prioritizeExpiringInventory: true,
    locale: 'es-AR',
    timezone: 'America/Argentina/Buenos_Aires',
  };
}

function substitutionContext(): FoodSubstitutionContext {
  return {
    schemaVersion: 'v1',
    contextVersion: 'context-v1',
    originalFoodId: 'food-1',
    recipeId: null,
    quantity: 100,
    unit: 'GRAM',
    reason: 'NOT_AVAILABLE',
    adultProfiles: [],
    availableInventory: [],
    locale: 'es-AR',
    timezone: 'America/Argentina/Buenos_Aires',
  };
}
