import type { StructuredPayload } from '../../domain/models/ai-recommendation.models';

export const WEEKLY_PLAN_GENERATOR = Symbol('WeeklyPlanGenerator');
export const RECIPE_SUGGESTION_PROVIDER = Symbol('RecipeSuggestionProvider');
export const FOOD_SUBSTITUTION_PROVIDER = Symbol('FoodSubstitutionProvider');

export interface AiProviderCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  correlationId?: string;
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

export interface AiGenerationResult {
  schemaVersion: string;
  payload: StructuredPayload;
  metadata: AiProviderMetadata;
}

export interface WeeklyPlanGenerationContext {
  schemaVersion: string;
  contextVersion: string;
  [key: string]: unknown;
}

export interface RecipeSuggestionContext {
  schemaVersion: string;
  contextVersion: string;
  [key: string]: unknown;
}

export interface FoodSubstitutionContext {
  schemaVersion: string;
  contextVersion: string;
  [key: string]: unknown;
}

export interface WeeklyPlanGenerator {
  generate(
    context: WeeklyPlanGenerationContext,
    options?: AiProviderCallOptions,
  ): Promise<AiGenerationResult>;
}

export interface RecipeSuggestionProvider {
  suggest(
    context: RecipeSuggestionContext,
    options?: AiProviderCallOptions,
  ): Promise<AiGenerationResult>;
}

export interface FoodSubstitutionProvider {
  suggestSubstitutions(
    context: FoodSubstitutionContext,
    options?: AiProviderCallOptions,
  ): Promise<AiGenerationResult>;
}
