import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import {
  MEAL_REPOSITORY,
  MEAL_UNIT_OF_WORK,
  MealRepository,
  MealUnitOfWork,
} from './application/ports/meal-repository.port';
import {
  REGISTER_MEAL_USE_CASE,
  RegisterMealUseCase,
} from './application/use-cases/register-meal.use-case';
import {
  DUPLICATE_MEAL_USE_CASE,
  DuplicateMealUseCase,
} from './application/use-cases/duplicate-meal.use-case';
import { GET_MEAL_USE_CASE, GetMealUseCase } from './application/use-cases/get-meal.use-case';
import { LIST_MEALS_USE_CASE, ListMealsUseCase } from './application/use-cases/list-meals.use-case';
import {
  CANCEL_MEAL_USE_CASE,
  CancelMealUseCase,
} from './application/use-cases/cancel-meal.use-case';
import {
  UPDATE_MEAL_USE_CASE,
  UpdateMealUseCase,
} from './application/use-cases/update-meal.use-case';
import { MealsController } from './presentation/http/meals.controller';
import { PrismaMealRepository } from './infrastructure/persistence/prisma-meal.repository';
import { CLOCK, Clock } from '../nutrition/application/ports/clock.port';
import {
  NUTRITION_ENGINE_SERVICE,
  NutritionEngineService,
} from '../nutrition/application/nutrition-engine.service';
import {
  DAILY_NUTRITION_SUMMARY_REPOSITORY,
  DailyNutritionSummaryRepository,
} from './application/ports/daily-nutrition-summary-repository.port';
import {
  GET_DAILY_NUTRITION_SUMMARY_USE_CASE,
  GetDailyNutritionSummaryUseCase,
} from './application/use-cases/get-daily-nutrition-summary.use-case';
import { PrismaDailyNutritionSummaryRepository } from './infrastructure/persistence/prisma-daily-nutrition-summary.repository';
import { DailyNutritionSummaryController } from './presentation/http/daily-nutrition-summary.controller';

@Module({
  imports: [IdentityModule, NutritionModule],
  controllers: [MealsController, DailyNutritionSummaryController],
  providers: [
    { provide: MEAL_REPOSITORY, useClass: PrismaMealRepository },
    { provide: MEAL_UNIT_OF_WORK, useClass: PrismaMealRepository },
    {
      provide: DAILY_NUTRITION_SUMMARY_REPOSITORY,
      useClass: PrismaDailyNutritionSummaryRepository,
    },
    {
      provide: REGISTER_MEAL_USE_CASE,
      inject: [MEAL_REPOSITORY, MEAL_UNIT_OF_WORK, NUTRITION_ENGINE_SERVICE, CLOCK],
      useFactory: (
        meals: MealRepository,
        unitOfWork: MealUnitOfWork,
        nutritionEngine: NutritionEngineService,
        clock: Clock,
      ) => new RegisterMealUseCase(meals, unitOfWork, nutritionEngine, clock),
    },
    {
      provide: DUPLICATE_MEAL_USE_CASE,
      inject: [MEAL_REPOSITORY, MEAL_UNIT_OF_WORK, NUTRITION_ENGINE_SERVICE, CLOCK],
      useFactory: (
        meals: MealRepository,
        unitOfWork: MealUnitOfWork,
        nutritionEngine: NutritionEngineService,
        clock: Clock,
      ) => new DuplicateMealUseCase(meals, unitOfWork, nutritionEngine, clock),
    },
    {
      provide: GET_MEAL_USE_CASE,
      inject: [MEAL_REPOSITORY],
      useFactory: (meals: MealRepository) => new GetMealUseCase(meals),
    },
    {
      provide: LIST_MEALS_USE_CASE,
      inject: [MEAL_REPOSITORY],
      useFactory: (meals: MealRepository) => new ListMealsUseCase(meals),
    },
    {
      provide: UPDATE_MEAL_USE_CASE,
      inject: [MEAL_REPOSITORY, MEAL_UNIT_OF_WORK, NUTRITION_ENGINE_SERVICE, CLOCK],
      useFactory: (
        meals: MealRepository,
        unitOfWork: MealUnitOfWork,
        nutritionEngine: NutritionEngineService,
        clock: Clock,
      ) => new UpdateMealUseCase(meals, unitOfWork, nutritionEngine, clock),
    },
    {
      provide: CANCEL_MEAL_USE_CASE,
      inject: [MEAL_REPOSITORY, MEAL_UNIT_OF_WORK, CLOCK],
      useFactory: (meals: MealRepository, unitOfWork: MealUnitOfWork, clock: Clock) =>
        new CancelMealUseCase(meals, unitOfWork, clock),
    },
    {
      provide: GET_DAILY_NUTRITION_SUMMARY_USE_CASE,
      inject: [DAILY_NUTRITION_SUMMARY_REPOSITORY],
      useFactory: (summaries: DailyNutritionSummaryRepository) =>
        new GetDailyNutritionSummaryUseCase(summaries),
    },
  ],
  exports: [MEAL_REPOSITORY, MEAL_UNIT_OF_WORK],
})
export class MealTrackingModule {}
