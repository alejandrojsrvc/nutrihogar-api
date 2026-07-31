import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { PrismaPreparedBatchRepository } from './prisma-prepared-batch.repository';

describe('PrismaPreparedBatchRepository', () => {
  it('persists the batch and nested nutrient snapshots in one transaction', async () => {
    const preparedBatch = createBatch();
    const create: jest.MockedFunction<(input: unknown) => Promise<void>> = jest
      .fn()
      .mockResolvedValue(undefined);
    const findUnique = jest.fn().mockResolvedValue(null);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({ preparedBatch: { findUnique, create, update: jest.fn() } }),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const repository = new PrismaPreparedBatchRepository(prisma);

    await repository.save(preparedBatch);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        id: 'batch-id',
        ingredients: { create: [{ id: 'ingredient-id', foodId: 'food-id' }] },
        nutrientSnapshots: { create: [{ nutrientCode: 'ENERGY_KCAL', amount: '650' }] },
      },
    });
  });

  it('replaces child rows when updating a batch', async () => {
    const update: jest.MockedFunction<(input: unknown) => Promise<void>> = jest
      .fn()
      .mockResolvedValue(undefined);
    const findUnique = jest.fn().mockResolvedValue({ id: 'batch-id' });
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({ preparedBatch: { findUnique, create: jest.fn(), update } }),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const repository = new PrismaPreparedBatchRepository(prisma);

    await repository.save(createBatch());

    expect(update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'batch-id' },
      data: {
        ingredients: { deleteMany: {}, create: [{ id: 'ingredient-id' }] },
        nutrientSnapshots: { deleteMany: {}, create: [{ nutrientCode: 'ENERGY_KCAL' }] },
      },
    });
  });
});

function createBatch() {
  const batch = PreparedBatch.start({
    id: 'batch-id',
    householdId: 'household-id',
    recipeId: 'recipe-id',
    recipeNameSnapshot: 'Arroz con pollo',
    preparedAt: new Date('2026-07-31T11:00:00.000Z'),
    createdById: 'user-id',
    createdAt: new Date('2026-07-31T11:00:00.000Z'),
    updatedAt: new Date('2026-07-31T11:00:00.000Z'),
    ingredients: [
      {
        id: 'ingredient-id',
        foodId: 'food-id',
        quantity: new Decimal(500),
        unit: 'GRAM',
        servingId: null,
        position: 1,
        notes: null,
        foodNameSnapshot: null,
        brandSnapshot: null,
        preparationStateSnapshot: null,
        confidenceLevel: null,
        baseQuantity: null,
        baseUnit: null,
        nutrients: [],
      },
    ],
  });
  batch.confirmIngredients(
    [
      {
        ingredientId: 'ingredient-id',
        foodId: 'food-id',
        foodName: 'Rice',
        foodBrand: null,
        preparationState: 'RAW',
        confidenceLevel: 'VERIFIED',
        baseQuantity: 500,
        baseUnit: 'GRAM',
        nutrients: [
          { code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Decimal(650) },
        ],
      },
    ],
    new Date('2026-07-31T12:00:00.000Z'),
  );
  return batch;
}
