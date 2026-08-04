import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeArchivedError } from '../../domain/errors/recipe.errors';
import {
  RecipeAccessDeniedError,
  RecipeNameConflictError,
  RecipeNotFoundError,
} from '../errors/recipe-application.errors';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { ImportRecipeUseCase } from './import-recipe.use-case';

describe('ImportRecipeUseCase', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let recipes: jest.Mocked<RecipeRepository>;
  let save: jest.Mock;

  beforeEach(() => {
    households = {
      findAccess: jest.fn().mockResolvedValue({
        household: { id: 'household-id' },
        role: 'MEMBER',
        status: 'ACTIVE',
      }),
      findActiveForUser: jest.fn(),
      updateName: jest.fn(),
    };
    save = jest.fn().mockResolvedValue(undefined);
    recipes = {
      findById: jest.fn(),
      findByIdForHousehold: jest.fn(),
      save,
      existsByName: jest.fn().mockResolvedValue(false),
      listByHousehold: jest.fn(),
    };
  });

  const useCase = () =>
    new ImportRecipeUseCase(households, recipes, {
      now: () => new Date('2026-07-30T12:00:00.000Z'),
    });

  it('imports a global recipe as an editable household copy', async () => {
    recipes.findById.mockResolvedValue(globalRecipe);

    const copy = await useCase().execute({
      actorId: 'user-id',
      householdId: 'household-id',
      recipeId: 'global-recipe-id',
    });

    expect(copy.isGlobal).toBe(false);
    expect(copy.householdId).toBe('household-id');
    expect(copy.createdById).toBe('user-id');
    expect(copy.tags).not.toContain('global');
    expect(copy.tags).not.toContain('seed');
    expect(copy.tags).toContain('imported');
    expect(copy.ingredients).toHaveLength(globalRecipe.ingredients.length);
    expect(save).toHaveBeenCalledWith(copy);
  });

  it('rejects importing a recipe that already exists by name', async () => {
    recipes.findById.mockResolvedValue(globalRecipe);
    recipes.existsByName.mockResolvedValue(true);

    await expect(
      useCase().execute({
        actorId: 'user-id',
        householdId: 'household-id',
        recipeId: 'global-recipe-id',
      }),
    ).rejects.toBeInstanceOf(RecipeNameConflictError);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects importing another household recipe without access', async () => {
    recipes.findById.mockResolvedValue(householdRecipe('other-household'));

    await expect(
      useCase().execute({
        actorId: 'user-id',
        householdId: 'household-id',
        recipeId: 'recipe-id',
      }),
    ).rejects.toBeInstanceOf(RecipeAccessDeniedError);
  });

  it('rejects importing an archived recipe', async () => {
    const archived = Recipe.create(baseProps('recipe-id', 'household-id'));
    archived.archive();
    recipes.findById.mockResolvedValue(archived);

    await expect(
      useCase().execute({
        actorId: 'user-id',
        householdId: 'household-id',
        recipeId: 'recipe-id',
      }),
    ).rejects.toBeInstanceOf(RecipeArchivedError);
  });

  it('rejects without active access and when the recipe does not exist', async () => {
    households.findAccess.mockResolvedValue(null);
    recipes.findById.mockResolvedValue(globalRecipe);
    await expect(
      useCase().execute({
        actorId: 'user-id',
        householdId: 'household-id',
        recipeId: 'global-recipe-id',
      }),
    ).rejects.toBeInstanceOf(RecipeAccessDeniedError);

    households.findAccess.mockResolvedValue({
      household: { id: 'household-id' },
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    recipes.findById.mockResolvedValue(null);
    await expect(
      useCase().execute({
        actorId: 'user-id',
        householdId: 'household-id',
        recipeId: 'missing',
      }),
    ).rejects.toBeInstanceOf(RecipeNotFoundError);
  });
});

const globalRecipe = Recipe.create({
  ...baseProps('global-recipe-id', null),
  isGlobal: true,
  tags: ['global', 'seed'],
  defaultServings: 2,
});

function householdRecipe(householdId: string) {
  return Recipe.create({ ...baseProps('recipe-id', householdId), tags: ['favorita'] });
}

function baseProps(id: string, householdId: string | null) {
  return {
    id,
    householdId,
    createdById: 'owner-id',
    name: 'Arroz con pollo',
    description: null,
    category: 'LUNCH',
    defaultServings: 4,
    estimatedPreparationMinutes: 60,
    tags: [] as string[],
    ingredients: [
      {
        id: 'ingredient-id',
        foodId: 'food-id',
        quantity: new Decimal(600),
        unit: 'GRAM' as const,
        servingId: null,
        position: 1,
        notes: null,
      },
    ],
    instructions: [{ id: 'step-1', position: 1, description: 'Cocinar y servir' }],
    createdAt: new Date('2026-07-30T12:00:00.000Z'),
    updatedAt: new Date('2026-07-30T12:00:00.000Z'),
  };
}
