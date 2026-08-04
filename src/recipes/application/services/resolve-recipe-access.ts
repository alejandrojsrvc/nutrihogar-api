import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeAccessDeniedError } from '../errors/recipe-application.errors';

export interface RecipeAccessContext {
  householdId: string;
}

/**
 * Verifies the actor can read the recipe and resolves the household used as
 * context for nutrition lookups. Global recipes are readable by any active
 * member and fall back to their first active household as context.
 */
export async function resolveRecipeAccessContext(
  households: HouseholdRepository,
  actorId: string,
  recipe: Recipe,
): Promise<RecipeAccessContext> {
  if (!recipe.isGlobal) {
    const access = await households.findAccess(actorId, recipe.householdId!);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();
    return { householdId: recipe.householdId! };
  }

  const activeHouseholds = await households.findActiveForUser(actorId);
  if (activeHouseholds.length === 0) throw new RecipeAccessDeniedError();
  return { householdId: activeHouseholds[0].id };
}
