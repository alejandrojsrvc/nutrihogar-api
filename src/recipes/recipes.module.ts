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
import { RecipesController } from './presentation/http/recipes.controller';
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
  controllers: [RecipesController],
  providers: [
    { provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepository },
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
  ],
})
export class RecipesModule {}
