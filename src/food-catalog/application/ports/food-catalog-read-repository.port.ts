import {
  CategoryView,
  FoodDetailView,
  FoodSearchResult,
  FoodType,
  NutrientDefinitionView,
  PreparationState,
} from '../models/food-catalog.models';

export const FOOD_CATALOG_READ_REPOSITORY = Symbol('FoodCatalogReadRepository');

export interface SearchFoodsCriteria {
  actorId: string;
  query?: string;
  categoryId?: string;
  preparationState?: PreparationState;
  foodType?: Exclude<FoodType, 'PREPARED'>;
  page: number;
  limit: number;
}

export interface FoodCatalogReadRepository {
  search(criteria: SearchFoodsCriteria): Promise<FoodSearchResult>;
  findVisibleById(actorId: string, foodId: string): Promise<FoodDetailView | null>;
  listCategories(): Promise<CategoryView[]>;
  listNutrients(): Promise<NutrientDefinitionView[]>;
}
