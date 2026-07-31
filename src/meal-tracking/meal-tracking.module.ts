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
import { MealsController } from './presentation/http/meals.controller';
import { PrismaMealRepository } from './infrastructure/persistence/prisma-meal.repository';
import { CLOCK, Clock } from '../nutrition/application/ports/clock.port';
import {
  NUTRITION_ENGINE_SERVICE,
  NutritionEngineService,
} from '../nutrition/application/nutrition-engine.service';

@Module({
  imports: [IdentityModule, NutritionModule],
  controllers: [MealsController],
  providers: [
    { provide: MEAL_REPOSITORY, useClass: PrismaMealRepository },
    { provide: MEAL_UNIT_OF_WORK, useClass: PrismaMealRepository },
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
  ],
})
export class MealTrackingModule {}
