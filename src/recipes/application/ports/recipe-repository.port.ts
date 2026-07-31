import { Recipe } from '../../domain/entities/recipe';

export const RECIPE_REPOSITORY = Symbol('RecipeRepository');

export interface RecipeRepository {
  findById(id: string): Promise<Recipe | null>;
  findByIdForHousehold(id: string, householdId: string): Promise<Recipe | null>;
  save(recipe: Recipe): Promise<void>;
  existsByName(householdId: string, name: string, excludeId?: string): Promise<boolean>;
}
