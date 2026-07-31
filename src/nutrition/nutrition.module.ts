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

@Module({
  imports: [IdentityModule],
  controllers: [NutritionGoalSuggestionsController],
  providers: [
    { provide: NUTRITION_FOOD_REPOSITORY, useClass: PrismaNutritionFoodRepository },
    { provide: CLOCK, useClass: SystemClock },
    { provide: NUTRITION_GOAL_REPOSITORY, useClass: PrismaNutritionGoalRepository },
    { provide: NUTRITION_GOAL_UNIT_OF_WORK, useClass: PrismaNutritionGoalUnitOfWork },
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
  ],
  exports: [
    NUTRITION_ENGINE_SERVICE,
    NUTRITION_GOAL_REPOSITORY,
    NUTRITION_GOAL_UNIT_OF_WORK,
    SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    GET_CURRENT_NUTRITION_GOAL_USE_CASE,
    LIST_NUTRITION_GOALS_USE_CASE,
  ],
})
export class NutritionModule {}
