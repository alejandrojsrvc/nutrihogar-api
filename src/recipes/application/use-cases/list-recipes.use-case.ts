import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { RecipeAccessDeniedError } from '../errors/recipe-application.errors';

export const LIST_RECIPES_USE_CASE = Symbol('ListRecipesUseCase');

export class ListRecipesUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
  ) {}

  async execute(
    actorId: string,
    householdId: string,
    query: { query?: string; page: number; limit: number },
  ) {
    const access = await this.households.findAccess(actorId, householdId);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();
    return this.recipes.listByHousehold(householdId, query);
  }
}
