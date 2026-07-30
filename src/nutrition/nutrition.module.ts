import { Module } from '@nestjs/common';
import {
  NUTRITION_ENGINE_SERVICE,
  NutritionEngineService,
} from './application/nutrition-engine.service';
import {
  NUTRITION_FOOD_REPOSITORY,
  NutritionFoodRepository,
} from './application/ports/nutrition-food-repository.port';
import { NutrientAggregator } from './domain/services/nutrient-aggregator';
import { NutritionCalculator } from './domain/services/nutrition-calculator';
import { UnitConverter } from './domain/services/unit-converter';
import { PrismaNutritionFoodRepository } from './infrastructure/persistence/prisma-nutrition-food.repository';

@Module({
  providers: [
    { provide: NUTRITION_FOOD_REPOSITORY, useClass: PrismaNutritionFoodRepository },
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
  ],
  exports: [NUTRITION_ENGINE_SERVICE],
})
export class NutritionModule {}
