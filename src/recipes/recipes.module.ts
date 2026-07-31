import { Module } from '@nestjs/common';
import { HouseholdsModule } from '../households/households.module';
import { IdentityModule } from '../identity/identity.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RECIPE_REPOSITORY, RecipeRepository } from './application/ports/recipe-repository.port';
import {
  ARCHIVE_RECIPE_USE_CASE,
  ArchiveRecipeUseCase,
} from './application/use-cases/archive-recipe.use-case';
import {
  CALCULATE_RECIPE_NUTRITION_USE_CASE,
  CalculateRecipeNutritionUseCase,
} from './application/use-cases/calculate-recipe-nutrition.use-case';
import {
  PREPARED_BATCH_REPOSITORY,
  PreparedBatchRepository,
} from './application/ports/prepared-batch-repository.port';
import {
  CANCEL_PREPARED_BATCH_USE_CASE,
  CancelPreparedBatchUseCase,
} from './application/use-cases/cancel-prepared-batch.use-case';
import {
  CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE,
  ConfirmPreparedBatchIngredientsUseCase,
} from './application/use-cases/confirm-prepared-batch-ingredients.use-case';
import {
  FINALIZE_PREPARED_BATCH_USE_CASE,
  FinalizePreparedBatchUseCase,
} from './application/use-cases/finalize-prepared-batch.use-case';
import {
  GET_PREPARED_BATCH_USE_CASE,
  GetPreparedBatchUseCase,
} from './application/use-cases/get-prepared-batch.use-case';
import {
  START_PREPARED_BATCH_USE_CASE,
  StartPreparedBatchUseCase,
} from './application/use-cases/start-prepared-batch.use-case';
import {
  UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE,
  UpdatePreparedBatchIngredientsUseCase,
} from './application/use-cases/update-prepared-batch-ingredients.use-case';
import {
  CREATE_RECIPE_USE_CASE,
  CreateRecipeUseCase,
} from './application/use-cases/create-recipe.use-case';
import { GET_RECIPE_USE_CASE, GetRecipeUseCase } from './application/use-cases/get-recipe.use-case';
import {
  LIST_RECIPES_USE_CASE,
  ListRecipesUseCase,
} from './application/use-cases/list-recipes.use-case';
import {
  UPDATE_RECIPE_USE_CASE,
  UpdateRecipeUseCase,
} from './application/use-cases/update-recipe.use-case';
import { PrismaRecipeRepository } from './infrastructure/persistence/prisma-recipe.repository';
import { PrismaPreparedBatchRepository } from './infrastructure/persistence/prisma-prepared-batch.repository';
import { RecipesController } from './presentation/http/recipes.controller';
import { PreparedBatchesController } from './presentation/http/prepared-batches.controller';
import { CLOCK, Clock } from '../nutrition/application/ports/clock.port';
import {
  NUTRITION_ENGINE_SERVICE,
  NutritionEngineService,
} from '../nutrition/application/nutrition-engine.service';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';

@Module({
  imports: [HouseholdsModule, IdentityModule, NutritionModule],
  controllers: [RecipesController, PreparedBatchesController],
  providers: [
    { provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepository },
    { provide: PREPARED_BATCH_REPOSITORY, useClass: PrismaPreparedBatchRepository },
    {
      provide: CREATE_RECIPE_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, RECIPE_REPOSITORY, NUTRITION_ENGINE_SERVICE, CLOCK],
      useFactory: (
        households: HouseholdRepository,
        recipes: RecipeRepository,
        nutritionEngine: NutritionEngineService,
        clock: Clock,
      ) => new CreateRecipeUseCase(households, recipes, nutritionEngine, clock),
    },
    {
      provide: UPDATE_RECIPE_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, RECIPE_REPOSITORY, NUTRITION_ENGINE_SERVICE],
      useFactory: (
        households: HouseholdRepository,
        recipes: RecipeRepository,
        nutritionEngine: NutritionEngineService,
      ) => new UpdateRecipeUseCase(households, recipes, nutritionEngine),
    },
    {
      provide: GET_RECIPE_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (households: HouseholdRepository, recipes: RecipeRepository) =>
        new GetRecipeUseCase(households, recipes),
    },
    {
      provide: LIST_RECIPES_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (households: HouseholdRepository, recipes: RecipeRepository) =>
        new ListRecipesUseCase(households, recipes),
    },
    {
      provide: ARCHIVE_RECIPE_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, RECIPE_REPOSITORY],
      useFactory: (households: HouseholdRepository, recipes: RecipeRepository) =>
        new ArchiveRecipeUseCase(households, recipes),
    },
    {
      provide: CALCULATE_RECIPE_NUTRITION_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, RECIPE_REPOSITORY, NUTRITION_ENGINE_SERVICE],
      useFactory: (
        households: HouseholdRepository,
        recipes: RecipeRepository,
        nutritionEngine: NutritionEngineService,
      ) => new CalculateRecipeNutritionUseCase(households, recipes, nutritionEngine),
    },
    {
      provide: START_PREPARED_BATCH_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        RECIPE_REPOSITORY,
        PREPARED_BATCH_REPOSITORY,
        NUTRITION_ENGINE_SERVICE,
        CLOCK,
      ],
      useFactory: (
        households: HouseholdRepository,
        recipes: RecipeRepository,
        batches: PreparedBatchRepository,
        nutritionEngine: NutritionEngineService,
        clock: Clock,
      ) => new StartPreparedBatchUseCase(households, recipes, batches, nutritionEngine, clock),
    },
    {
      provide: UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY, NUTRITION_ENGINE_SERVICE],
      useFactory: (
        households: HouseholdRepository,
        batches: PreparedBatchRepository,
        nutritionEngine: NutritionEngineService,
      ) => new UpdatePreparedBatchIngredientsUseCase(households, batches, nutritionEngine),
    },
    {
      provide: GET_PREPARED_BATCH_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY],
      useFactory: (households: HouseholdRepository, batches: PreparedBatchRepository) =>
        new GetPreparedBatchUseCase(households, batches),
    },
    {
      provide: CANCEL_PREPARED_BATCH_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY, CLOCK],
      useFactory: (
        households: HouseholdRepository,
        batches: PreparedBatchRepository,
        clock: Clock,
      ) => new CancelPreparedBatchUseCase(households, batches, clock),
    },
    {
      provide: CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY, NUTRITION_ENGINE_SERVICE, CLOCK],
      useFactory: (
        households: HouseholdRepository,
        batches: PreparedBatchRepository,
        nutritionEngine: NutritionEngineService,
        clock: Clock,
      ) => new ConfirmPreparedBatchIngredientsUseCase(households, batches, nutritionEngine, clock),
    },
    {
      provide: FINALIZE_PREPARED_BATCH_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, PREPARED_BATCH_REPOSITORY, CLOCK],
      useFactory: (
        households: HouseholdRepository,
        batches: PreparedBatchRepository,
        clock: Clock,
      ) => new FinalizePreparedBatchUseCase(households, batches, clock),
    },
  ],
})
export class RecipesModule {}
