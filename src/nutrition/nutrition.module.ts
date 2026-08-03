import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  NUTRITION_ENGINE_SERVICE,
  NutritionEngineService,
} from './application/nutrition-engine.service';
import {
  NUTRITION_FOOD_REPOSITORY,
  NutritionFoodRepository,
} from './application/ports/nutrition-food-repository.port';
import { CLOCK, Clock } from './application/ports/clock.port';
import {
  NUTRITION_GOAL_REPOSITORY,
  NUTRITION_GOAL_UNIT_OF_WORK,
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from './application/ports/nutrition-goal-repository.port';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from './application/ports/nutrition-profile-repository.port';
import {
  CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  ConfirmNutritionGoalSuggestionUseCase,
} from './application/use-cases/confirm-nutrition-goal-suggestion.use-case';
import {
  REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  RejectNutritionGoalSuggestionUseCase,
} from './application/use-cases/reject-nutrition-goal-suggestion.use-case';
import {
  GET_CURRENT_NUTRITION_GOAL_USE_CASE,
  GetCurrentNutritionGoalUseCase,
} from './application/use-cases/get-current-nutrition-goal.use-case';
import {
  LIST_NUTRITION_GOALS_USE_CASE,
  ListNutritionGoalsUseCase,
} from './application/use-cases/list-nutrition-goals.use-case';
import {
  SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  SaveNutritionGoalSuggestionUseCase,
} from './application/use-cases/save-nutrition-goal-suggestion.use-case';
import {
  GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  GenerateNutritionGoalSuggestionUseCase,
} from './application/use-cases/generate-nutrition-goal-suggestion.use-case';
import { NutrientAggregator } from './domain/services/nutrient-aggregator';
import { NutritionCalculator } from './domain/services/nutrition-calculator';
import { UnitConverter } from './domain/services/unit-converter';
import { PrismaNutritionFoodRepository } from './infrastructure/persistence/prisma-nutrition-food.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaNutritionGoalRepository } from './infrastructure/persistence/prisma-nutrition-goal.repository';
import { PrismaNutritionGoalUnitOfWork } from './infrastructure/persistence/prisma-nutrition-goal.unit-of-work';
import { PrismaNutritionProfileRepository } from './infrastructure/persistence/prisma-nutrition-profile.repository';
import { NutritionGoalCalculator } from './domain/services/nutrition-goal-calculator';
import { NutritionGoalSuggestionsController } from './presentation/http/nutrition-goal-suggestions.controller';
import { NutritionGoalReviewController } from './presentation/http/nutrition-goal-review.controller';
import { NutritionGoalReviewEvaluator } from './domain/services/nutrition-goal-review-evaluator';
import {
  NUTRITION_GOAL_REVIEW_REPOSITORY,
  NUTRITION_GOAL_REVIEW_UNIT_OF_WORK,
  NutritionGoalReviewRepository,
  NutritionGoalReviewUnitOfWork,
} from './application/ports/nutrition-goal-review-repository.port';
import { PrismaNutritionGoalReviewRepository } from './infrastructure/persistence/prisma-nutrition-goal-review.repository';
import {
  GET_NUTRITION_GOAL_REVIEW_QUERY,
  GetNutritionGoalReviewQuery,
} from './application/use-cases/get-nutrition-goal-review.query';
import {
  GENERATE_REVIEWED_NUTRITION_GOAL_PROPOSAL_USE_CASE,
  GenerateReviewedNutritionGoalProposalUseCase,
} from './application/use-cases/generate-reviewed-nutrition-goal-proposal.use-case';
import {
  ACCEPT_NUTRITION_GOAL_REVIEW_USE_CASE,
  AcceptNutritionGoalReviewUseCase,
} from './application/use-cases/accept-nutrition-goal-review.use-case';
import {
  REJECT_NUTRITION_GOAL_REVIEW_USE_CASE,
  RejectNutritionGoalReviewUseCase,
} from './application/use-cases/reject-nutrition-goal-review.use-case';
import {
  POSTPONE_NUTRITION_GOAL_REVIEW_USE_CASE,
  PostponeNutritionGoalReviewUseCase,
} from './application/use-cases/postpone-nutrition-goal-review.use-case';

@Module({
  imports: [IdentityModule],
  controllers: [NutritionGoalSuggestionsController, NutritionGoalReviewController],
  providers: [
    { provide: NUTRITION_FOOD_REPOSITORY, useClass: PrismaNutritionFoodRepository },
    { provide: CLOCK, useClass: SystemClock },
    { provide: NUTRITION_GOAL_REPOSITORY, useClass: PrismaNutritionGoalRepository },
    { provide: NUTRITION_GOAL_UNIT_OF_WORK, useClass: PrismaNutritionGoalUnitOfWork },
    { provide: NUTRITION_GOAL_REVIEW_REPOSITORY, useClass: PrismaNutritionGoalReviewRepository },
    { provide: NUTRITION_GOAL_REVIEW_UNIT_OF_WORK, useExisting: NUTRITION_GOAL_UNIT_OF_WORK },
    NutritionGoalReviewEvaluator,
    { provide: NUTRITION_PROFILE_REPOSITORY, useClass: PrismaNutritionProfileRepository },
    {
      provide: NUTRITION_ENGINE_SERVICE,
      inject: [NUTRITION_FOOD_REPOSITORY],
      useFactory: (foods: NutritionFoodRepository) =>
        new NutritionEngineService(
          foods,
          new UnitConverter(),
          new NutritionCalculator(),
          new NutrientAggregator(),
        ),
    },
    {
      provide: GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
      inject: [
        NUTRITION_GOAL_REPOSITORY,
        NUTRITION_PROFILE_REPOSITORY,
        NUTRITION_GOAL_UNIT_OF_WORK,
        CLOCK,
      ],
      useFactory: (
        goals: NutritionGoalRepository,
        profiles: NutritionProfileRepository,
        unitOfWork: NutritionGoalUnitOfWork,
        clock: Clock,
      ) =>
        new GenerateNutritionGoalSuggestionUseCase(
          goals,
          profiles,
          unitOfWork,
          new NutritionGoalCalculator(),
          clock,
        ),
    },
    {
      provide: SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
      inject: [NUTRITION_GOAL_REPOSITORY, NUTRITION_GOAL_UNIT_OF_WORK, CLOCK],
      useFactory: (
        goals: NutritionGoalRepository,
        unitOfWork: NutritionGoalUnitOfWork,
        clock: Clock,
      ) => new SaveNutritionGoalSuggestionUseCase(goals, unitOfWork, clock),
    },
    {
      provide: CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
      inject: [NUTRITION_GOAL_REPOSITORY, NUTRITION_GOAL_UNIT_OF_WORK, CLOCK],
      useFactory: (
        goals: NutritionGoalRepository,
        unitOfWork: NutritionGoalUnitOfWork,
        clock: Clock,
      ) => new ConfirmNutritionGoalSuggestionUseCase(goals, unitOfWork, clock),
    },
    {
      provide: REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE,
      inject: [NUTRITION_GOAL_REPOSITORY, NUTRITION_GOAL_UNIT_OF_WORK, CLOCK],
      useFactory: (
        goals: NutritionGoalRepository,
        unitOfWork: NutritionGoalUnitOfWork,
        clock: Clock,
      ) => new RejectNutritionGoalSuggestionUseCase(goals, unitOfWork, clock),
    },
    {
      provide: GET_CURRENT_NUTRITION_GOAL_USE_CASE,
      inject: [NUTRITION_GOAL_REPOSITORY],
      useFactory: (goals: NutritionGoalRepository) => new GetCurrentNutritionGoalUseCase(goals),
    },
    {
      provide: LIST_NUTRITION_GOALS_USE_CASE,
      inject: [NUTRITION_GOAL_REPOSITORY],
      useFactory: (goals: NutritionGoalRepository) => new ListNutritionGoalsUseCase(goals),
    },
    {
      provide: GET_NUTRITION_GOAL_REVIEW_QUERY,
      inject: [
        NUTRITION_GOAL_REPOSITORY,
        NUTRITION_GOAL_REVIEW_REPOSITORY,
        NUTRITION_GOAL_REVIEW_UNIT_OF_WORK,
        CLOCK,
        NutritionGoalReviewEvaluator,
      ],
      useFactory: (
        goals: NutritionGoalRepository,
        reviews: NutritionGoalReviewRepository,
        uow: NutritionGoalReviewUnitOfWork,
        clock: Clock,
        evaluator: NutritionGoalReviewEvaluator,
      ) => new GetNutritionGoalReviewQuery(goals, reviews, uow, evaluator, clock),
    },
    {
      provide: GENERATE_REVIEWED_NUTRITION_GOAL_PROPOSAL_USE_CASE,
      inject: [
        NUTRITION_GOAL_REPOSITORY,
        GET_NUTRITION_GOAL_REVIEW_QUERY,
        NUTRITION_GOAL_REVIEW_UNIT_OF_WORK,
        GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
        CLOCK,
      ],
      useFactory: (
        goals: NutritionGoalRepository,
        review: GetNutritionGoalReviewQuery,
        uow: NutritionGoalReviewUnitOfWork,
        generate: GenerateNutritionGoalSuggestionUseCase,
        clock: Clock,
      ) => new GenerateReviewedNutritionGoalProposalUseCase(goals, review, uow, generate, clock),
    },
    {
      provide: ACCEPT_NUTRITION_GOAL_REVIEW_USE_CASE,
      inject: [
        NUTRITION_GOAL_REPOSITORY,
        NUTRITION_GOAL_REVIEW_REPOSITORY,
        NUTRITION_GOAL_REVIEW_UNIT_OF_WORK,
        CLOCK,
      ],
      useFactory: (
        goals: NutritionGoalRepository,
        reviews: NutritionGoalReviewRepository,
        uow: NutritionGoalReviewUnitOfWork,
        clock: Clock,
      ) => new AcceptNutritionGoalReviewUseCase(goals, reviews, uow, clock),
    },
    {
      provide: REJECT_NUTRITION_GOAL_REVIEW_USE_CASE,
      inject: [
        NUTRITION_GOAL_REPOSITORY,
        NUTRITION_GOAL_REVIEW_REPOSITORY,
        NUTRITION_GOAL_REVIEW_UNIT_OF_WORK,
        CLOCK,
      ],
      useFactory: (
        goals: NutritionGoalRepository,
        reviews: NutritionGoalReviewRepository,
        uow: NutritionGoalReviewUnitOfWork,
        clock: Clock,
      ) => new RejectNutritionGoalReviewUseCase(goals, reviews, uow, clock),
    },
    {
      provide: POSTPONE_NUTRITION_GOAL_REVIEW_USE_CASE,
      inject: [
        NUTRITION_GOAL_REPOSITORY,
        NUTRITION_GOAL_REVIEW_REPOSITORY,
        NUTRITION_GOAL_REVIEW_UNIT_OF_WORK,
        CLOCK,
      ],
      useFactory: (
        goals: NutritionGoalRepository,
        reviews: NutritionGoalReviewRepository,
        uow: NutritionGoalReviewUnitOfWork,
        clock: Clock,
      ) => new PostponeNutritionGoalReviewUseCase(goals, reviews, uow, clock),
    },
  ],
  exports: [
    NUTRITION_FOOD_REPOSITORY,
    NUTRITION_ENGINE_SERVICE,
    CLOCK,
    NUTRITION_GOAL_REPOSITORY,
    NUTRITION_GOAL_UNIT_OF_WORK,
    SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    GET_CURRENT_NUTRITION_GOAL_USE_CASE,
    LIST_NUTRITION_GOALS_USE_CASE,
    GET_NUTRITION_GOAL_REVIEW_QUERY,
  ],
})
export class NutritionModule {}
