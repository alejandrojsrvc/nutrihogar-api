import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import type { HouseholdView } from '../../../households/application/models/household-view';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import {
  RecipeAccessDeniedError,
  RecipeGlobalReadOnlyError,
  RecipeNotFoundError,
} from '../errors/recipe-application.errors';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { ArchiveRecipeUseCase } from './archive-recipe.use-case';
import { GetRecipeUseCase } from './get-recipe.use-case';
import { UpdateRecipeUseCase } from './update-recipe.use-case';

describe('global recipe access', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let recipes: jest.Mocked<RecipeRepository>;
  let save: jest.Mock;

  beforeEach(() => {
    households = {
      findAccess: jest.fn(),
      findActiveForUser: jest.fn(),
      updateName: jest.fn(),
    };
    save = jest.fn().mockResolvedValue(undefined);
    recipes = {
      findById: jest.fn(),
      findByIdForHousehold: jest.fn(),
      save,
      existsByName: jest.fn(),
      listByHousehold: jest.fn(),
    };
  });

  it('reads a global recipe using the actor first active household as context', async () => {
    recipes.findById.mockResolvedValue(globalRecipe);
    households.findActiveForUser.mockResolvedValue([householdView('home')]);

    await expect(
      new GetRecipeUseCase(households, recipes).execute('user-id', 'global-id'),
    ).resolves.toBe(globalRecipe);
    expect(households.findActiveForUser.mock.calls[0]?.[0]).toBe('user-id');
  });

  it('rejects reading a global recipe without an active household', async () => {
    recipes.findById.mockResolvedValue(globalRecipe);
    households.findActiveForUser.mockResolvedValue([]);

    await expect(
      new GetRecipeUseCase(households, recipes).execute('user-id', 'global-id'),
    ).rejects.toBeInstanceOf(RecipeAccessDeniedError);
  });

  it('rejects missing recipes', async () => {
    recipes.findById.mockResolvedValue(null);

    await expect(
      new GetRecipeUseCase(households, recipes).execute('user-id', 'missing'),
    ).rejects.toBeInstanceOf(RecipeNotFoundError);
  });

  it('never archives or updates a global recipe', async () => {
    recipes.findById.mockResolvedValue(globalRecipe);

    await expect(
      new ArchiveRecipeUseCase(households, recipes).execute('user-id', 'global-id'),
    ).rejects.toBeInstanceOf(RecipeGlobalReadOnlyError);
    await expect(
      new UpdateRecipeUseCase(households, recipes, nutritionEngine()).execute({
        actorId: 'user-id',
        recipeId: 'global-id',
        name: 'Renombrada',
      }),
    ).rejects.toBeInstanceOf(RecipeGlobalReadOnlyError);
    expect(save).not.toHaveBeenCalled();
  });
});

function nutritionEngine(): NutritionEngineService {
  return {
    calculate: jest.fn(),
    calculateMany: jest.fn(),
  } as unknown as NutritionEngineService;
}

function householdView(id: string): HouseholdView {
  return {
    id,
    name: 'Home',
    timezone: 'UTC',
    currency: 'ARS',
    weeklyBudget: null,
    createdById: 'user-id',
    createdAt: new Date('2026-07-30T12:00:00.000Z'),
    updatedAt: new Date('2026-07-30T12:00:00.000Z'),
  };
}

const globalRecipe = Recipe.create({
  id: 'global-id',
  householdId: null,
  createdById: null,
  name: 'Arroz con pollo',
  description: null,
  category: 'LUNCH',
  defaultServings: 4,
  estimatedPreparationMinutes: 60,
  tags: ['global', 'seed'],
  isGlobal: true,
  ingredients: [
    {
      id: 'ingredient-id',
      foodId: 'food-id',
      quantity: new Decimal(600),
      unit: 'GRAM',
      servingId: null,
      position: 1,
      notes: null,
    },
  ],
  instructions: [],
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
});
