import Decimal from 'decimal.js';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeArchivedError } from '../../domain/errors/recipe.errors';
import { RecipeRepository } from '../ports/recipe-repository.port';
import {
  RecipeAccessDeniedError,
  RecipeNameConflictError,
  RecipeNotFoundError,
} from '../errors/recipe-application.errors';

export const IMPORT_RECIPE_USE_CASE = Symbol('ImportRecipeUseCase');

export interface ImportRecipeCommand {
  actorId: string;
  householdId: string;
  recipeId: string;
}

export class ImportRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: ImportRecipeCommand) {
    const access = await this.households.findAccess(command.actorId, command.householdId);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();

    const source = await this.recipes.findById(command.recipeId);
    if (!source) throw new RecipeNotFoundError();
    if (source.status === 'ARCHIVED') throw new RecipeArchivedError();
    if (!source.isGlobal && source.householdId !== command.householdId) {
      throw new RecipeAccessDeniedError();
    }
    if (await this.recipes.existsByName(command.householdId, source.name)) {
      throw new RecipeNameConflictError();
    }

    const now = this.clock.now();
    const copy = Recipe.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      createdById: command.actorId,
      name: source.name,
      description: source.description,
      category: source.category,
      defaultServings: source.defaultServings,
      estimatedPreparationMinutes: source.estimatedPreparationMinutes,
      tags: importedTags(source.tags),
      ingredients: source.ingredients.map((ingredient) => ({
        id: crypto.randomUUID(),
        foodId: ingredient.foodId,
        quantity: new Decimal(ingredient.quantity),
        unit: ingredient.unit,
        servingId: ingredient.servingId,
        position: ingredient.position,
        notes: ingredient.notes,
      })),
      instructions: source.instructions.map((instruction) => ({
        id: crypto.randomUUID(),
        position: instruction.position,
        description: instruction.description,
      })),
      createdAt: now,
      updatedAt: now,
    });

    await this.recipes.save(copy);
    return copy;
  }
}

function importedTags(sourceTags: string[]): string[] {
  const seedTags = new Set(['global', 'seed']);
  return [...new Set([...sourceTags.filter((tag) => !seedTags.has(tag)), 'imported'])];
}
