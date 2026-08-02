/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { AiProviderError } from '../../application/errors/ai-provider.error';
import type { WeeklyPlanGenerationContext } from '../../application/ports/ai-generation.ports';
import {
  StructuredAiRecommendationAdapter,
  type StructuredAiTransport,
} from './structured-ai-recommendation.adapter';

describe('StructuredAiRecommendationAdapter', () => {
  it('passes typed context and bounded execution options to the transport', async () => {
    const complete = jest.fn().mockResolvedValue({
      schemaVersion: 'v1',
      payload: { items: [] },
      provider: 'fake',
      model: 'weekly-v1',
    });
    const adapter = new StructuredAiRecommendationAdapter(
      { complete } satisfies StructuredAiTransport,
      config(),
    );

    await adapter.generate(context(), { correlationId: 'request-1' });

    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'WEEKLY_PLAN',
        model: 'weekly-v1',
        options: expect.objectContaining({
          timeoutMs: 2000,
          maxRetries: 1,
          correlationId: 'request-1',
        }),
      }),
    );
  });

  it('does not call the transport when the feature is disabled', async () => {
    const complete = jest.fn();
    const adapter = new StructuredAiRecommendationAdapter(
      { complete } satisfies StructuredAiTransport,
      { ...config(), featureEnabled: false },
    );

    await expect(adapter.generate(context())).rejects.toMatchObject({
      code: 'AI_CONFIGURATION_ERROR',
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('normalizes invalid provider responses', async () => {
    const transport: StructuredAiTransport = {
      complete: jest.fn().mockResolvedValue({ schemaVersion: 'v1', payload: [] }),
    };
    const adapter = new StructuredAiRecommendationAdapter(transport, config());

    await expect(adapter.generate(context())).rejects.toBeInstanceOf(AiProviderError);
    await expect(adapter.generate(context())).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      retryable: false,
    });
  });
});

function config() {
  return {
    provider: 'fake',
    weeklyPlanModel: 'weekly-v1',
    recipeModel: 'recipe-v1',
    requestTimeoutMs: 2000,
    maxRetries: 1,
    featureEnabled: true,
  };
}

function context(): WeeklyPlanGenerationContext {
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
