import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { CalculateRecipeNutritionUseCase } from './calculate-recipe-nutrition.use-case';

describe('CalculateRecipeNutritionUseCase', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let recipes: jest.Mocked<RecipeRepository>;
  let calculateMany: jest.Mock;
  let useCase: CalculateRecipeNutritionUseCase;

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
    recipes = {
      findById: jest.fn().mockResolvedValue(recipe),
      findByIdForHousehold: jest.fn(),
      save: jest.fn(),
      existsByName: jest.fn(),
      listByHousehold: jest.fn(),
    };
    calculateMany = jest.fn();
    useCase = new CalculateRecipeNutritionUseCase(households, recipes, {
      calculateMany,
    } as unknown as NutritionEngineService);
  });

  it('sums ingredient nutrients and calculates estimated nutrients per serving', async () => {
    calculateMany.mockResolvedValue({
      items: [
        {
          baseQuantity: new Decimal(600),
          baseUnit: 'GRAM',
          nutrients: { ENERGY_KCAL: new Decimal(800), PROTEIN: new Decimal(40) },
          nutrientMetadata: {},
        },
      ],
      nutrients: { ENERGY_KCAL: new Decimal(800), PROTEIN: new Decimal(40) },
    });

    const result = await useCase.execute('user-id', 'recipe-id');

    expect(result.totalNutrients.ENERGY_KCAL?.equals(800)).toBe(true);
    expect(result.perServingNutrients.ENERGY_KCAL?.equals(200)).toBe(true);
    expect(result.perServingNutrients.PROTEIN?.equals(10)).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(calculateMany).toHaveBeenCalledWith([
      {
        actorId: 'user-id',
        householdId: 'household-id',
        foodId: 'food-id',
        quantity: new Decimal(600),
        unit: 'GRAM',
        servingId: undefined,
      },
    ]);
  });

  it('returns a warning when an ingredient has no nutritional data', async () => {
    calculateMany.mockResolvedValue({
      items: [
        {
          baseQuantity: new Decimal(1),
          baseUnit: 'UNIT',
          nutrients: {},
          nutrientMetadata: {},
        },
      ],
      nutrients: {},
    });

    const result = await useCase.execute('user-id', 'recipe-id');

    expect(result.warnings).toEqual([
      expect.objectContaining({
        ingredientId: 'ingredient-id',
        foodId: 'food-id',
        code: 'NUTRIENTS_UNAVAILABLE',
      }),
    ]);
  });
});

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
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
});
