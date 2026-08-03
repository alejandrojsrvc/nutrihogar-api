import {
  AiProviderError,
  type AiProviderErrorCode,
} from '../../application/errors/ai-provider.error';
import type {
  AiGenerationResult,
  AiProviderCallOptions,
  FoodSubstitutionContext,
  FoodSubstitutionProvider,
  RecipeSuggestionContext,
  RecipeSuggestionProvider,
  WeeklyPlanGenerationContext,
  WeeklyPlanGenerator,
} from '../../application/ports/ai-generation.ports';

export interface StructuredAiTransportRequest {
  operation: 'WEEKLY_PLAN' | 'RECIPE' | 'FOOD_SUBSTITUTION';
  model: string;
  context: WeeklyPlanGenerationContext | RecipeSuggestionContext | FoodSubstitutionContext;
  options: Required<Pick<AiProviderCallOptions, 'timeoutMs' | 'maxRetries'>> &
    AiProviderCallOptions;
}

export interface StructuredAiTransport {
  complete(request: StructuredAiTransportRequest): Promise<AiGenerationResult>;
}

export interface StructuredAiAdapterConfig {
  provider: string;
  weeklyPlanModel: string;
  recipeModel: string;
  requestTimeoutMs: number;
  maxRetries: number;
  featureEnabled: boolean;
}

export class StructuredAiRecommendationAdapter
  implements WeeklyPlanGenerator, RecipeSuggestionProvider, FoodSubstitutionProvider
{
  constructor(
    private readonly transport: StructuredAiTransport,
    private readonly config: StructuredAiAdapterConfig,
  ) {}

  generate(context: WeeklyPlanGenerationContext, options: AiProviderCallOptions = {}) {
    return this.execute('WEEKLY_PLAN', context, this.config.weeklyPlanModel, options);
  }

  suggest(context: RecipeSuggestionContext, options: AiProviderCallOptions = {}) {
    return this.execute('RECIPE', context, this.config.recipeModel, options);
  }

  suggestSubstitutions(context: FoodSubstitutionContext, options: AiProviderCallOptions = {}) {
    return this.execute('FOOD_SUBSTITUTION', context, this.config.recipeModel, options);
  }

  private async execute(
    operation: StructuredAiTransportRequest['operation'],
    context: StructuredAiTransportRequest['context'],
    model: string,
    options: AiProviderCallOptions,
  ): Promise<AiGenerationResult> {
    if (!this.config.featureEnabled) {
      throw new AiProviderError(
        'AI_CONFIGURATION_ERROR',
        'AI recommendations are disabled.',
        false,
      );
    }
    if (!model.trim()) {
      throw new AiProviderError('AI_CONFIGURATION_ERROR', 'AI model is not configured.', false);
    }
    if (!context.schemaVersion.trim() || !context.contextVersion.trim()) {
      throw new AiProviderError('AI_INVALID_RESPONSE', 'AI context version is required.', false);
    }

    try {
      const response = await this.transport.complete({
        operation,
        model,
        context,
        options: {
          ...options,
          timeoutMs: options.timeoutMs ?? this.config.requestTimeoutMs,
          maxRetries: options.maxRetries ?? this.config.maxRetries,
        },
      });
      return validateResponse(response, this.config.provider);
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(classifyError(error), 'AI provider request failed.', false, {
        cause: error,
      });
    }
  }
}

function validateResponse(
  response: AiGenerationResult,
  configuredProvider: string,
): AiGenerationResult {
  if (!response || typeof response !== 'object') {
    throw new AiProviderError('AI_INVALID_RESPONSE', 'AI provider response is invalid.', false);
  }
  if (!response.schemaVersion?.trim() || !response.payload || Array.isArray(response.payload)) {
    throw new AiProviderError('AI_INVALID_RESPONSE', 'AI provider payload is invalid.', false);
  }
  return {
    ...response,
    metadata: {
      ...response.metadata,
      provider: response.metadata?.provider?.trim() || configuredProvider,
      model: response.metadata?.model?.trim() || 'unknown',
    },
  };
}

function classifyError(error: unknown): AiProviderErrorCode {
  if (error instanceof DOMException && error.name === 'AbortError') return 'AI_PROVIDER_TIMEOUT';
  return 'AI_PROVIDER_UNAVAILABLE';
}
