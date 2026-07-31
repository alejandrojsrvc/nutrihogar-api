import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeArchiveAccessDeniedError } from '../errors/recipe-application.errors';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { ArchiveRecipeUseCase } from './archive-recipe.use-case';
import { CreateRecipeUseCase } from './create-recipe.use-case';

describe('Recipe use cases', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let recipes: jest.Mocked<RecipeRepository>;
  let nutritionEngine: jest.Mocked<NutritionEngineService>;
  let save: jest.Mock;
  let calculate: jest.Mock;

  beforeEach(() => {
    households = {
      findActiveForUser: jest.fn(),
      findAccess: jest.fn().mockResolvedValue({
        household: { id: 'household-id' },
        role: 'MEMBER',
        status: 'ACTIVE',
      }),
      updateName: jest.fn(),
    };
    save = jest.fn().mockResolvedValue(undefined);
    calculate = jest.fn().mockResolvedValue(calculation);
    recipes = {
      findById: jest.fn(),
      findByIdForHousehold: jest.fn(),
      save,
      existsByName: jest.fn().mockResolvedValue(false),
      listByHousehold: jest.fn(),
    };
    nutritionEngine = {
      calculate,
      calculateMany: jest.fn(),
    } as unknown as jest.Mocked<NutritionEngineService>;
  });

  it('creates a recipe after validating household food visibility', async () => {
    const useCase = new CreateRecipeUseCase(households, recipes, nutritionEngine, {
      now: () => now,
    });

    const result = await useCase.execute({
      actorId: 'user-id',
      householdId: 'household-id',
      name: 'Arroz con pollo',
      defaultServings: 4,
      ingredients: [{ foodId: 'food-id', quantity: 600, unit: 'GRAM', position: 1 }],
    });

    expect(result.name).toBe('Arroz con pollo');
    expect(calculate).toHaveBeenCalledWith(
      expect.objectContaining({ foodId: 'food-id', householdId: 'household-id' }),
    );
    expect(save).toHaveBeenCalledWith(result);
  });

  it('allows only administrators to archive recipes', async () => {
    recipes.findById.mockResolvedValue(recipe);
    const useCase = new ArchiveRecipeUseCase(households, recipes);

    await expect(useCase.execute('user-id', 'recipe-id')).rejects.toBeInstanceOf(
      RecipeArchiveAccessDeniedError,
    );
    expect(save).not.toHaveBeenCalled();

    households.findAccess.mockResolvedValue({
      household: { id: 'household-id' },
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await useCase.execute('admin-id', 'recipe-id');
    expect(recipe.status).toBe('ARCHIVED');
    expect(save).toHaveBeenCalledWith(recipe);
  });
});

const now = new Date('2026-07-30T12:00:00.000Z');
const calculation = {
  foodId: 'food-id',
  foodName: 'Arroz',
  foodBrand: null,
  preparationState: 'RAW' as const,
  confidenceLevel: 'VERIFIED' as const,
  baseQuantity: new Decimal(600),
  baseUnit: 'GRAM' as const,
  nutrients: { ENERGY_KCAL: new Decimal(2100) },
  nutrientMetadata: { ENERGY_KCAL: { name: 'Energía', unit: 'kcal' } },
};

const recipe = Recipe.create({
  id: 'recipe-id',
  householdId: 'household-id',
  createdById: 'user-id',
  name: 'Arroz con pollo',
  description: null,
  category: 'LUNCH',
  defaultServings: 4,
  estimatedPreparationMinutes: 60,
  tags: [],
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
  createdAt: now,
  updatedAt: now,
});
