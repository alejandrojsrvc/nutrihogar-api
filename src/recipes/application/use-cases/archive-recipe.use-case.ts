import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import {
  RecipeAccessDeniedError,
  RecipeArchiveAccessDeniedError,
  RecipeNotFoundError,
} from '../errors/recipe-application.errors';

export const ARCHIVE_RECIPE_USE_CASE = Symbol('ArchiveRecipeUseCase');

export class ArchiveRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
  ) {}

  async execute(actorId: string, recipeId: string): Promise<void> {
    const recipe = await this.recipes.findById(recipeId);
    if (!recipe) throw new RecipeNotFoundError();
    const access = await this.households.findAccess(actorId, recipe.householdId);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();
    if (access.role !== 'ADMIN') throw new RecipeArchiveAccessDeniedError();
    recipe.archive();
    await this.recipes.save(recipe);
  }
}
