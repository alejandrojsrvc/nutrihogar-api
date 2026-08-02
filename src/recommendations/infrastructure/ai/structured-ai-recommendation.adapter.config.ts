export interface StructuredAiRecommendationAdapterConfig {
  provider: string;
  weeklyPlanModel: string;
  recipeModel: string;
  requestTimeoutMs: number;
  maxRetries: number;
  featureEnabled: boolean;
}
