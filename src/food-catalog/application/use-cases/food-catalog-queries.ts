import { FoodNotFoundError } from '../errors/food-not-found.error';
import {
  CategoryView,
  FoodDetailView,
  FoodSearchResult,
  NutrientDefinitionView,
} from '../models/food-catalog.models';
import {
  FoodCatalogReadRepository,
  SearchFoodsCriteria,
} from '../ports/food-catalog-read-repository.port';

export const SEARCH_FOODS_USE_CASE = Symbol('SearchFoodsUseCase');
export const GET_FOOD_DETAIL_USE_CASE = Symbol('GetFoodDetailUseCase');
export const LIST_FOOD_CATEGORIES_USE_CASE = Symbol('ListFoodCategoriesUseCase');
export const LIST_NUTRIENTS_USE_CASE = Symbol('ListNutrientsUseCase');

export class SearchFoodsUseCase {
  constructor(private readonly foods: FoodCatalogReadRepository) {}
  execute(criteria: SearchFoodsCriteria): Promise<FoodSearchResult> {
    return this.foods.search({ ...criteria, query: criteria.query?.trim() || undefined });
  }
}

export class GetFoodDetailUseCase {
  constructor(private readonly foods: FoodCatalogReadRepository) {}
  async execute(actorId: string, foodId: string): Promise<FoodDetailView> {
    const food = await this.foods.findVisibleById(actorId, foodId);
    if (!food) throw new FoodNotFoundError();
    return food;
  }
}

export class ListFoodCategoriesUseCase {
  constructor(private readonly foods: FoodCatalogReadRepository) {}
  execute(): Promise<CategoryView[]> {
    return this.foods.listCategories();
  }
}

export class ListNutrientsUseCase {
  constructor(private readonly foods: FoodCatalogReadRepository) {}
  execute(): Promise<NutrientDefinitionView[]> {
    return this.foods.listNutrients();
  }
}
