import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import {
  RecipeArchiveAccessDeniedError,
  RecipeGlobalReadOnlyError,
  RecipeNotFoundError,
} from '../errors/recipe-application.errors';
import { resolveRecipeAccessContext } from '../services/resolve-recipe-access';

export const ARCHIVE_RECIPE_USE_CASE = Symbol('ArchiveRecipeUseCase');

export class ArchiveRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
  ) {}

  async execute(actorId: string, recipeId: string): Promise<void> {
    const recipe = await this.recipes.findById(recipeId);
    if (!recipe) throw new RecipeNotFoundError();
    if (recipe.isGlobal) throw new RecipeGlobalReadOnlyError();
    const { householdId } = await resolveRecipeAccessContext(this.households, actorId, recipe);
    const access = await this.households.findAccess(actorId, householdId);
    if (!access || access.status !== 'ACTIVE' || access.role !== 'ADMIN') {
      throw new RecipeArchiveAccessDeniedError();
    }
    recipe.archive();
    await this.recipes.save(recipe);
  }
}
