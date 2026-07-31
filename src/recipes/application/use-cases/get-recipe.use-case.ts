import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { RecipeAccessDeniedError, RecipeNotFoundError } from '../errors/recipe-application.errors';

export const GET_RECIPE_USE_CASE = Symbol('GetRecipeUseCase');

export class GetRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
  ) {}

  async execute(actorId: string, recipeId: string) {
    const recipe = await this.recipes.findById(recipeId);
    if (!recipe) throw new RecipeNotFoundError();
    const access = await this.households.findAccess(actorId, recipe.householdId);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();
    return recipe;
  }
}
