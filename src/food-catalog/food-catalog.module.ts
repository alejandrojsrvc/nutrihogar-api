import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  FOOD_CATALOG_READ_REPOSITORY,
  FoodCatalogReadRepository,
} from './application/ports/food-catalog-read-repository.port';
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
import { PrismaFoodCatalogReadRepository } from './infrastructure/persistence/prisma-food-catalog-read.repository';
import { FoodCatalogController } from './presentation/http/food-catalog.controller';

@Module({
  imports: [IdentityModule],
  controllers: [FoodCatalogController],
  providers: [
    { provide: FOOD_CATALOG_READ_REPOSITORY, useClass: PrismaFoodCatalogReadRepository },
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
  ],
  exports: [FOOD_CATALOG_READ_REPOSITORY],
})
export class FoodCatalogModule {}
