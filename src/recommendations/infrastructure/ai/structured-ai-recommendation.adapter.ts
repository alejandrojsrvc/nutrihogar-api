import {
  AI_PROVIDER_ERROR_CODES,
  AiProviderError,
  type AiProviderErrorCode,
} from '../../application/errors/ai-provider.error';
import type {
  AiProviderCallOptions,
  FoodSubstitutionContext,
  FoodSubstitutionProvider,
  FoodSubstitutionResult,
  RecipeSuggestionContext,
  RecipeSuggestionProvider,
  RecipeSuggestionResult,
  WeeklyPlanGenerationContext,
  WeeklyPlanGenerationResult,
  WeeklyPlanGenerator,
} from '../../application/ports/ai-generation.ports';
import type { StructuredPayload } from '../../domain/models/ai-recommendation.models';
import { StructuredAiRecommendationAdapterConfig } from './structured-ai-recommendation.adapter.config';

export interface StructuredAiTransportRequest {
  operation: 'WEEKLY_PLAN' | 'RECIPE' | 'FOOD_SUBSTITUTION';
  model: string;
  context: WeeklyPlanGenerationContext | RecipeSuggestionContext | FoodSubstitutionContext;
  options: Required<Pick<AiProviderCallOptions, 'timeoutMs' | 'maxRetries'>> &
    AiProviderCallOptions;
}

export interface StructuredAiTransportResponse {
  schemaVersion: string;
  payload: StructuredPayload;
  provider: string;
  model: string;
  inputTokenCount?: number | null;
  outputTokenCount?: number | null;
  estimatedCost?: string | null;
  latencyMilliseconds?: number | null;
  correlationId?: string | null;
}

export interface StructuredAiTransport {
  complete(request: StructuredAiTransportRequest): Promise<StructuredAiTransportResponse>;
}

export class StructuredAiRecommendationAdapter
  implements WeeklyPlanGenerator, RecipeSuggestionProvider, FoodSubstitutionProvider
{
  constructor(
    private readonly transport: StructuredAiTransport,
    private readonly config: StructuredAiRecommendationAdapterConfig,
  ) {}

  generate(
    context: WeeklyPlanGenerationContext,
    options: AiProviderCallOptions = {},
  ): Promise<WeeklyPlanGenerationResult> {
    return this.execute('WEEKLY_PLAN', context, this.config.weeklyPlanModel, options);
  }

  suggest(
    context: RecipeSuggestionContext,
    options: AiProviderCallOptions = {},
  ): Promise<RecipeSuggestionResult> {
    return this.execute('RECIPE', context, this.config.recipeModel, options);
  }

  suggestSubstitutions(
    context: FoodSubstitutionContext,
    options: AiProviderCallOptions = {},
  ): Promise<FoodSubstitutionResult> {
    return this.execute('FOOD_SUBSTITUTION', context, this.config.recipeModel, options);
  }

  private async execute(
    operation: StructuredAiTransportRequest['operation'],
    context: StructuredAiTransportRequest['context'],
    model: string,
    options: AiProviderCallOptions,
  ): Promise<StructuredAiTransportResponse> {
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
  response: StructuredAiTransportResponse,
  configuredProvider: string,
): StructuredAiTransportResponse {
  if (!response || typeof response !== 'object') {
    throw new AiProviderError('AI_INVALID_RESPONSE', 'AI provider response is invalid.', false);
  }
  if (!response.schemaVersion?.trim() || !response.payload || Array.isArray(response.payload)) {
    throw new AiProviderError('AI_INVALID_RESPONSE', 'AI provider payload is invalid.', false);
  }
  return {
    ...response,
    provider: response.provider?.trim() || configuredProvider,
    model: response.model?.trim() || 'unknown',
  };
}

function classifyError(error: unknown): AiProviderErrorCode {
  if (error instanceof DOMException && error.name === 'AbortError') return 'AI_PROVIDER_TIMEOUT';
  return AI_PROVIDER_ERROR_CODES.includes('AI_PROVIDER_UNAVAILABLE')
    ? 'AI_PROVIDER_UNAVAILABLE'
    : 'AI_INVALID_RESPONSE';
}
