import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HouseholdsModule } from '../households/households.module';
import { InventoryModule } from '../inventory/inventory.module';
import { IdentityModule } from '../identity/identity.module';
import { MealPlanningModule } from '../meal-planning/meal-planning.module';
import {
  AI_PROPOSAL_REPOSITORY,
  type AiProposalRepository,
} from './application/ports/ai-proposal-repository.port';
import { AI_WEEKLY_PLAN_ACCEPTANCE_UNIT_OF_WORK } from './application/ports/ai-weekly-plan-acceptance-unit-of-work.port';
import {
  RECIPE_SUGGESTION_CONTEXT_BUILDER,
  WEEKLY_PLAN_CONTEXT_BUILDER,
} from './application/ports/ai-context-builder.ports';
import {
  RECIPE_SUGGESTION_PROVIDER,
  WEEKLY_PLAN_GENERATOR,
} from './application/ports/ai-generation.ports';
import { AI_RATE_LIMITER } from './application/ports/ai-rate-limiter.port';
import { GenerateAiRecipeSuggestionsUseCase } from './application/use-cases/generate-ai-recipe-suggestions.use-case';
import { GenerateAiWeeklyPlanProposalUseCase } from './application/use-cases/generate-ai-weekly-plan-proposal.use-case';
import { AcceptAiWeeklyPlanProposalUseCase } from './application/use-cases/accept-ai-weekly-plan-proposal.use-case';
import {
  GetAiWeeklyPlanProposalQuery,
  RejectAiWeeklyPlanProposalUseCase,
  UpdateAiWeeklyPlanProposalUseCase,
} from './application/use-cases/manage-ai-weekly-plan-proposal.use-cases';
import {
  ACCEPT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
  GENERATE_AI_RECIPE_SUGGESTIONS_USE_CASE,
  GENERATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
  GET_AI_WEEKLY_PLAN_PROPOSAL_QUERY,
  REJECT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
  UPDATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
} from './application/use-cases/recommendation-use-case.tokens';
import { AiWeeklyPlanProposalValidator } from './application/services/ai-weekly-plan-proposal-validator';
import { PrismaAiProposalRepository } from './infrastructure/persistence/prisma-ai-proposal.repository';
import { PrismaAiWeeklyPlanAcceptanceUnitOfWork } from './infrastructure/persistence/prisma-ai-weekly-plan-acceptance.unit-of-work';
import {
  PrismaRecipeSuggestionContextBuilder,
  PrismaWeeklyPlanContextBuilder,
} from './infrastructure/context/prisma-ai-context.builders';
import { InMemoryAiRateLimiter } from './infrastructure/rate-limit/in-memory-ai-rate-limiter';
import { StructuredAiRecommendationAdapter } from './infrastructure/ai/structured-ai-recommendation.adapter';
import { UnconfiguredAiTransport } from './infrastructure/ai/unconfigured-ai.transport';
import { AiRecommendationsController } from './presentation/http/ai-recommendations.controller';
import type {
  WeeklyPlanContextBuilder,
  RecipeSuggestionContextBuilder,
} from './application/ports/ai-context-builder.ports';
import type {
  WeeklyPlanGenerator,
  RecipeSuggestionProvider,
} from './application/ports/ai-generation.ports';
import type { AiRateLimiter } from './application/ports/ai-rate-limiter.port';
import type { AiWeeklyPlanAcceptanceUnitOfWork } from './application/ports/ai-weekly-plan-acceptance-unit-of-work.port';

@Module({
  imports: [IdentityModule, HouseholdsModule, InventoryModule, MealPlanningModule],
  controllers: [AiRecommendationsController],
  providers: [
    { provide: AI_PROPOSAL_REPOSITORY, useClass: PrismaAiProposalRepository },
    { provide: AI_RATE_LIMITER, useClass: InMemoryAiRateLimiter },
    { provide: WEEKLY_PLAN_CONTEXT_BUILDER, useClass: PrismaWeeklyPlanContextBuilder },
    { provide: RECIPE_SUGGESTION_CONTEXT_BUILDER, useClass: PrismaRecipeSuggestionContextBuilder },
    {
      provide: AI_WEEKLY_PLAN_ACCEPTANCE_UNIT_OF_WORK,
      useClass: PrismaAiWeeklyPlanAcceptanceUnitOfWork,
    },
    { provide: 'AI_TRANSPORT', useClass: UnconfiguredAiTransport },
    {
      provide: 'AI_ADAPTER',
      inject: ['AI_TRANSPORT', ConfigService],
      useFactory: (transport: UnconfiguredAiTransport, config: ConfigService) =>
        new StructuredAiRecommendationAdapter(transport, {
          provider: config.get<string>('AI_PROVIDER', ''),
          weeklyPlanModel: config.get<string>('AI_WEEKLY_PLAN_MODEL', ''),
          recipeModel: config.get<string>('AI_RECIPE_MODEL', ''),
          requestTimeoutMs: config.get<number>('AI_REQUEST_TIMEOUT_MS', 15000),
          maxRetries: config.get<number>('AI_MAX_RETRIES', 1),
          featureEnabled: config.get<boolean>('AI_ENABLED', false),
        }),
    },
    { provide: WEEKLY_PLAN_GENERATOR, useExisting: 'AI_ADAPTER' },
    { provide: RECIPE_SUGGESTION_PROVIDER, useExisting: 'AI_ADAPTER' },
    AiWeeklyPlanProposalValidator,
    {
      provide: GENERATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
      inject: [
        WEEKLY_PLAN_CONTEXT_BUILDER,
        WEEKLY_PLAN_GENERATOR,
        AI_PROPOSAL_REPOSITORY,
        AI_RATE_LIMITER,
        AiWeeklyPlanProposalValidator,
        ConfigService,
      ],
      useFactory: (
        contexts: WeeklyPlanContextBuilder,
        generator: WeeklyPlanGenerator,
        proposals: AiProposalRepository,
        limiter: AiRateLimiter,
        validator: AiWeeklyPlanProposalValidator,
        config: ConfigService,
      ) =>
        new GenerateAiWeeklyPlanProposalUseCase(
          contexts,
          generator,
          proposals,
          limiter,
          validator,
          {
            maxRequestsPerHousehold: config.get('AI_RATE_LIMIT', 5),
            windowMs: config.get('AI_RATE_WINDOW_MS', 60000),
          },
        ),
    },
    {
      provide: GENERATE_AI_RECIPE_SUGGESTIONS_USE_CASE,
      inject: [
        RECIPE_SUGGESTION_CONTEXT_BUILDER,
        RECIPE_SUGGESTION_PROVIDER,
        AI_PROPOSAL_REPOSITORY,
        AI_RATE_LIMITER,
        ConfigService,
      ],
      useFactory: (
        contexts: RecipeSuggestionContextBuilder,
        provider: RecipeSuggestionProvider,
        proposals: AiProposalRepository,
        limiter: AiRateLimiter,
        config: ConfigService,
      ) =>
        new GenerateAiRecipeSuggestionsUseCase(contexts, provider, proposals, limiter, {
          maxRequestsPerHousehold: config.get('AI_RATE_LIMIT', 5),
          windowMs: config.get('AI_RATE_WINDOW_MS', 60000),
        }),
    },
    {
      provide: GET_AI_WEEKLY_PLAN_PROPOSAL_QUERY,
      inject: [AI_PROPOSAL_REPOSITORY],
      useFactory: (p: AiProposalRepository) => new GetAiWeeklyPlanProposalQuery(p),
    },
    {
      provide: UPDATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
      inject: [AI_PROPOSAL_REPOSITORY, AiWeeklyPlanProposalValidator],
      useFactory: (p: AiProposalRepository, v: AiWeeklyPlanProposalValidator) =>
        new UpdateAiWeeklyPlanProposalUseCase(p, v),
    },
    {
      provide: ACCEPT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
      inject: [
        AI_PROPOSAL_REPOSITORY,
        AI_WEEKLY_PLAN_ACCEPTANCE_UNIT_OF_WORK,
        AiWeeklyPlanProposalValidator,
      ],
      useFactory: (
        p: AiProposalRepository,
        u: AiWeeklyPlanAcceptanceUnitOfWork,
        v: AiWeeklyPlanProposalValidator,
      ) => new AcceptAiWeeklyPlanProposalUseCase(p, u, v),
    },
    {
      provide: REJECT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
      inject: [AI_PROPOSAL_REPOSITORY],
      useFactory: (p: AiProposalRepository) => new RejectAiWeeklyPlanProposalUseCase(p),
    },
  ],
})
export class RecommendationsModule {}
