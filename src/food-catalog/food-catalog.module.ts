import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  FOOD_CATALOG_MUTATION_REPOSITORY,
  FOOD_CATALOG_UNIT_OF_WORK,
  FOOD_HOUSEHOLD_ACCESS_REPOSITORY,
  FoodCatalogMutationRepository,
  FoodCatalogUnitOfWork,
  FoodHouseholdAccessRepository,
} from './application/ports/food-catalog-mutation.port';
import {
  FOOD_CATALOG_READ_REPOSITORY,
  FoodCatalogReadRepository,
} from './application/ports/food-catalog-read-repository.port';
import {
  CREATE_CUSTOM_FOOD_USE_CASE,
  CreateCustomFoodUseCase,
  DELETE_CUSTOM_FOOD_USE_CASE,
  DeleteCustomFoodUseCase,
  UPDATE_CUSTOM_FOOD_USE_CASE,
  UpdateCustomFoodUseCase,
} from './application/use-cases/custom-food-use-cases';
import {
  GET_FOOD_DETAIL_USE_CASE,
  GetFoodDetailUseCase,
  LIST_FOOD_CATEGORIES_USE_CASE,
  LIST_NUTRIENTS_USE_CASE,
  ListFoodCategoriesUseCase,
  ListNutrientsUseCase,
  SEARCH_FOODS_USE_CASE,
  SearchFoodsUseCase,
} from './application/use-cases/food-catalog-queries';
import { PrismaFoodCatalogMutationRepository } from './infrastructure/persistence/prisma-food-catalog-mutation.repository';
import { PrismaFoodCatalogReadRepository } from './infrastructure/persistence/prisma-food-catalog-read.repository';
import { PrismaFoodCatalogUnitOfWork } from './infrastructure/persistence/prisma-food-catalog.unit-of-work';
import { FoodCatalogController } from './presentation/http/food-catalog.controller';

@Module({
  imports: [IdentityModule],
  controllers: [FoodCatalogController],
  providers: [
    { provide: FOOD_CATALOG_READ_REPOSITORY, useClass: PrismaFoodCatalogReadRepository },
    PrismaFoodCatalogMutationRepository,
    {
      provide: FOOD_HOUSEHOLD_ACCESS_REPOSITORY,
      useExisting: PrismaFoodCatalogMutationRepository,
    },
    {
      provide: FOOD_CATALOG_MUTATION_REPOSITORY,
      useExisting: PrismaFoodCatalogMutationRepository,
    },
    { provide: FOOD_CATALOG_UNIT_OF_WORK, useClass: PrismaFoodCatalogUnitOfWork },
    {
      provide: SEARCH_FOODS_USE_CASE,
      inject: [FOOD_CATALOG_READ_REPOSITORY],
      useFactory: (foods: FoodCatalogReadRepository) => new SearchFoodsUseCase(foods),
    },
    {
      provide: GET_FOOD_DETAIL_USE_CASE,
      inject: [FOOD_CATALOG_READ_REPOSITORY],
      useFactory: (foods: FoodCatalogReadRepository) => new GetFoodDetailUseCase(foods),
    },
    {
      provide: LIST_FOOD_CATEGORIES_USE_CASE,
      inject: [FOOD_CATALOG_READ_REPOSITORY],
      useFactory: (foods: FoodCatalogReadRepository) => new ListFoodCategoriesUseCase(foods),
    },
    {
      provide: LIST_NUTRIENTS_USE_CASE,
      inject: [FOOD_CATALOG_READ_REPOSITORY],
      useFactory: (foods: FoodCatalogReadRepository) => new ListNutrientsUseCase(foods),
    },
    {
      provide: CREATE_CUSTOM_FOOD_USE_CASE,
      inject: [
        FOOD_HOUSEHOLD_ACCESS_REPOSITORY,
        FOOD_CATALOG_READ_REPOSITORY,
        FOOD_CATALOG_UNIT_OF_WORK,
      ],
      useFactory: (
        access: FoodHouseholdAccessRepository,
        foods: FoodCatalogReadRepository,
        unitOfWork: FoodCatalogUnitOfWork,
      ) => new CreateCustomFoodUseCase(access, foods, unitOfWork),
    },
    {
      provide: UPDATE_CUSTOM_FOOD_USE_CASE,
      inject: [
        FOOD_HOUSEHOLD_ACCESS_REPOSITORY,
        FOOD_CATALOG_MUTATION_REPOSITORY,
        FOOD_CATALOG_READ_REPOSITORY,
        FOOD_CATALOG_UNIT_OF_WORK,
      ],
      useFactory: (
        access: FoodHouseholdAccessRepository,
        mutations: FoodCatalogMutationRepository,
        foods: FoodCatalogReadRepository,
        unitOfWork: FoodCatalogUnitOfWork,
      ) => new UpdateCustomFoodUseCase(access, mutations, foods, unitOfWork),
    },
    {
      provide: DELETE_CUSTOM_FOOD_USE_CASE,
      inject: [
        FOOD_HOUSEHOLD_ACCESS_REPOSITORY,
        FOOD_CATALOG_MUTATION_REPOSITORY,
        FOOD_CATALOG_UNIT_OF_WORK,
      ],
      useFactory: (
        access: FoodHouseholdAccessRepository,
        mutations: FoodCatalogMutationRepository,
        unitOfWork: FoodCatalogUnitOfWork,
      ) => new DeleteCustomFoodUseCase(access, mutations, unitOfWork),
    },
  ],
  exports: [FOOD_CATALOG_READ_REPOSITORY],
})
export class FoodCatalogModule {}
