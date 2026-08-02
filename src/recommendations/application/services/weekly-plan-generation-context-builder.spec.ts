import {
  WeeklyPlanGenerationContextBuilder,
  type WeeklyPlanContextSources,
} from './weekly-plan-generation-context-builder';

describe('WeeklyPlanGenerationContextBuilder', () => {
  it('builds a bounded context and prioritizes expiring inventory', async () => {
    const sources = createSources();
    const builder = new WeeklyPlanGenerationContextBuilder(sources);

    const context = await builder.build({
      householdId: 'household-1',
      maxInventoryItems: 2,
      maxRecipes: 1,
    });

    expect(context.availableInventory.map((item) => item.opaqueFoodId)).toEqual([
      'food-expiring',
      'food-extra',
    ]);
    expect(context.availableRecipes.map((recipe) => recipe.opaqueRecipeId)).toEqual(['recipe-1']);
    expect(context.contextVersion).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(context).not.toHaveProperty('email');
    expect(context).not.toHaveProperty('weight');
  });

  it('produces the same context version for the same source data', async () => {
    const sources = createSources();
    const builder = new WeeklyPlanGenerationContextBuilder(sources);

    const first = await builder.build({ householdId: 'household-1' });
    const second = await builder.build({ householdId: 'household-1' });

    expect(first.contextVersion).toBe(second.contextVersion);
  });
});

function createSources(): WeeklyPlanContextSources {
  return {
    households: {
      findById: jest.fn().mockResolvedValue({
        preferences: { maxRepeatedLunches: 2 },
        weeklyBudget: null,
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR',
      }),
    },
    adults: {
      listByHousehold: jest.fn().mockResolvedValue([]),
    },
    inventory: {
      listActiveByHousehold: jest
        .fn()
        .mockResolvedValue([
          inventory('food-stable', null),
          inventory('food-expiring', '2026-08-03'),
          inventory('food-extra', '2026-08-05'),
        ]),
    },
    recipes: {
      listActiveByHousehold: jest.fn().mockResolvedValue([recipe('recipe-2'), recipe('recipe-1')]),
    },
    planning: {
      getContext: jest.fn().mockResolvedValue({
        mealSlots: ['LUNCH'],
        recentMealHistory: [],
        excludedFoods: [],
      }),
    },
  };
}

function inventory(opaqueFoodId: string, expiresAt: string | null) {
  return {
    opaqueFoodId,
    quantity: 100,
    unit: 'GRAM',
    preparationState: 'RAW',
    expiresAt,
    isPrepared: false,
  };
}

function recipe(opaqueRecipeId: string) {
  return {
    opaqueRecipeId,
    name: opaqueRecipeId,
    ingredientFoodIds: [],
    nutrition: {},
    preparationMinutes: 20,
    category: null,
  };
}
