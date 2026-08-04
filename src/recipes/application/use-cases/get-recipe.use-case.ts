import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { RecipeNotFoundError } from '../errors/recipe-application.errors';
import { resolveRecipeAccessContext } from '../services/resolve-recipe-access';

export const GET_RECIPE_USE_CASE = Symbol('GetRecipeUseCase');

export class GetRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
  ) {}

  async execute(actorId: string, recipeId: string) {
    const recipe = await this.recipes.findById(recipeId);
    if (!recipe) throw new RecipeNotFoundError();
    await resolveRecipeAccessContext(this.households, actorId, recipe);
    return recipe;
  }
}
