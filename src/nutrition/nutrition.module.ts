import { Module } from '@nestjs/common';
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
  CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  ConfirmNutritionGoalSuggestionUseCase,
} from './application/use-cases/confirm-nutrition-goal-suggestion.use-case';
import {
  SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  SaveNutritionGoalSuggestionUseCase,
} from './application/use-cases/save-nutrition-goal-suggestion.use-case';
import { NutrientAggregator } from './domain/services/nutrient-aggregator';
import { NutritionCalculator } from './domain/services/nutrition-calculator';
import { UnitConverter } from './domain/services/unit-converter';
import { PrismaNutritionFoodRepository } from './infrastructure/persistence/prisma-nutrition-food.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaNutritionGoalRepository } from './infrastructure/persistence/prisma-nutrition-goal.repository';
import { PrismaNutritionGoalUnitOfWork } from './infrastructure/persistence/prisma-nutrition-goal.unit-of-work';

@Module({
  providers: [
    { provide: NUTRITION_FOOD_REPOSITORY, useClass: PrismaNutritionFoodRepository },
    { provide: CLOCK, useClass: SystemClock },
    { provide: NUTRITION_GOAL_REPOSITORY, useClass: PrismaNutritionGoalRepository },
    { provide: NUTRITION_GOAL_UNIT_OF_WORK, useClass: PrismaNutritionGoalUnitOfWork },
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
  ],
  exports: [
    NUTRITION_ENGINE_SERVICE,
    NUTRITION_GOAL_REPOSITORY,
    NUTRITION_GOAL_UNIT_OF_WORK,
    SAVE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
    CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  ],
})
export class NutritionModule {}
