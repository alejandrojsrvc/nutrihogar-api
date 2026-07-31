import { Recipe } from '../../domain/entities/recipe';

export const RECIPE_REPOSITORY = Symbol('RecipeRepository');

export interface RecipeRepository {
  findById(id: string): Promise<Recipe | null>;
  findByIdForHousehold(id: string, householdId: string): Promise<Recipe | null>;
  save(recipe: Recipe): Promise<void>;
  existsByName(householdId: string, name: string, excludeId?: string): Promise<boolean>;
  listByHousehold(householdId: string, criteria: RecipeListCriteria): Promise<RecipeListResult>;
}

export interface RecipeListCriteria {
  query?: string;
  page: number;
  limit: number;
}

export interface RecipeListResult {
  items: Recipe[];
  page: number;
  limit: number;
  total: number;
}
