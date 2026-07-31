import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { RecipeIngredientCommand, RecipeInstructionCommand } from '../models/recipe-command.models';
import { ensureRecipeFoodsVisible } from '../services/ensure-recipe-foods';
import {
  RecipeAccessDeniedError,
  RecipeNameConflictError,
} from '../errors/recipe-application.errors';

export const CREATE_RECIPE_USE_CASE = Symbol('CreateRecipeUseCase');

export interface CreateRecipeCommand {
  actorId: string;
  householdId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  defaultServings: number;
  estimatedPreparationMinutes?: number | null;
  tags?: string[];
  ingredients: RecipeIngredientCommand[];
  instructions?: RecipeInstructionCommand[];
}

export class CreateRecipeUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly recipes: RecipeRepository,
    private readonly nutritionEngine: NutritionEngineService,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateRecipeCommand) {
    const access = await this.households.findAccess(command.actorId, command.householdId);
    if (!access || access.status !== 'ACTIVE') throw new RecipeAccessDeniedError();
    if (await this.recipes.existsByName(command.householdId, command.name)) {
      throw new RecipeNameConflictError();
    }
    await ensureRecipeFoodsVisible(
      this.nutritionEngine,
      command.actorId,
      command.householdId,
      command.ingredients,
    );

    const now = this.clock.now();
    const recipe = Recipe.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      createdById: command.actorId,
      name: command.name,
      description: command.description ?? null,
      category: command.category ?? null,
      defaultServings: command.defaultServings,
      estimatedPreparationMinutes: command.estimatedPreparationMinutes ?? null,
      tags: command.tags ?? [],
      ingredients: toIngredients(command.ingredients),
      instructions: toInstructions(command.instructions ?? []),
      createdAt: now,
      updatedAt: now,
    });
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
