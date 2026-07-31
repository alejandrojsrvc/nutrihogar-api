import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import { Recipe } from '../../domain/entities/recipe';
import { PrismaRecipeRepository } from './prisma-recipe.repository';

describe('PrismaRecipeRepository', () => {
  it('saves a recipe and children in one transaction', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const create: jest.MockedFunction<(input: unknown) => Promise<void>> = jest
      .fn()
      .mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({ recipe: { findUnique, create } }),
    );
    const repository = new PrismaRecipeRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.save(recipe);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        id: 'recipe-id',
        name: 'Arroz con pollo',
        ingredients: { create: [{ foodId: 'food-id', quantity: '100', position: 1 }] },
      },
    });
  });

  it('reconstructs the aggregate without exposing a Prisma record', async () => {
    const findUnique = jest.fn().mockResolvedValue(record);
    const repository = new PrismaRecipeRepository({
      recipe: { findUnique },
    } as unknown as PrismaService);

    const result = await repository.findById('recipe-id');

    expect(result?.name).toBe('Arroz con pollo');
    expect(result?.ingredients[0]?.quantity.equals(100)).toBe(true);
  });
});

const recipeProps = {
  id: 'recipe-id',
  householdId: 'household-id',
  createdById: 'user-id',
  name: 'Arroz con pollo',
  description: null,
  category: 'LUNCH',
  defaultServings: 4,
  estimatedPreparationMinutes: 60,
  tags: [],
  status: 'ACTIVE' as const,
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
  deletedAt: null,
  ingredients: [
    {
      id: 'ingredient-id',
      foodId: 'food-id',
      quantity: new Decimal(100),
      unit: 'GRAM' as const,
      servingId: null,
      position: 1,
      notes: null,
    },
  ],
  instructions: [],
};

const recipe = Recipe.create(recipeProps);

const record = {
  ...recipeProps,
  ingredients: [{ ...recipeProps.ingredients[0], quantity: new Prisma.Decimal(100) }],
  instructions: [],
};
