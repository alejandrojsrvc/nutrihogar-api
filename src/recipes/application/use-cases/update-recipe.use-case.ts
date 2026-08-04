import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { RecipeIngredientCommand, RecipeInstructionCommand } from '../models/recipe-command.models';
import { ensureRecipeFoodsVisible } from '../services/ensure-recipe-foods';
import {
  RecipeGlobalReadOnlyError,
  RecipeNameConflictError,
  RecipeNotFoundError,
} from '../errors/recipe-application.errors';
import { resolveRecipeAccessContext } from '../services/resolve-recipe-access';

export const UPDATE_RECIPE_USE_CASE = Symbol('UpdateRecipeUseCase');

export interface UpdateRecipeCommand {
  actorId: string;
  recipeId: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  defaultServings?: number;
  estimatedPreparationMinutes?: number | null;
  tags?: string[];
  ingredients?: RecipeIngredientCommand[];
  instructions?: RecipeInstructionCommand[];
}

export class UpdateRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
    private readonly nutritionEngine: NutritionEngineService,
  ) {}

  async execute(command: UpdateRecipeCommand) {
    const recipe = await this.recipes.findById(command.recipeId);
    if (!recipe) throw new RecipeNotFoundError();
    if (recipe.isGlobal) throw new RecipeGlobalReadOnlyError();
    const { householdId } = await resolveRecipeAccessContext(
      this.households,
      command.actorId,
      recipe,
    );
    if (
      command.name !== undefined &&
      (await this.recipes.existsByName(householdId, command.name, recipe.id))
    ) {
      throw new RecipeNameConflictError();
    }
    if (command.ingredients) {
      await ensureRecipeFoodsVisible(
        this.nutritionEngine,
        command.actorId,
        householdId,
        command.ingredients,
      );
    }

    if (command.name !== undefined) recipe.rename(command.name);
    if (command.description !== undefined) recipe.changeDescription(command.description);
    recipe.changeDetails({
      category: command.category,
      defaultServings: command.defaultServings,
      estimatedPreparationMinutes: command.estimatedPreparationMinutes,
      tags: command.tags,
    });
    if (command.ingredients) recipe.replaceIngredients(toIngredients(command.ingredients));
    if (command.instructions) recipe.replaceInstructions(toInstructions(command.instructions));
    await this.recipes.save(recipe);
    return recipe;
  }
}

function toIngredients(ingredients: RecipeIngredientCommand[]) {
  return ingredients.map((ingredient) => ({
    id: ingredient.id ?? crypto.randomUUID(),
    foodId: ingredient.foodId,
    quantity: new Decimal(ingredient.quantity),
    unit: ingredient.unit,
    servingId: ingredient.servingId ?? null,
    position: ingredient.position,
    notes: ingredient.notes ?? null,
  }));
}

function toInstructions(instructions: RecipeInstructionCommand[]) {
  return instructions.map((instruction) => ({
    id: instruction.id ?? crypto.randomUUID(),
    position: instruction.position,
    description: instruction.description,
  }));
}
