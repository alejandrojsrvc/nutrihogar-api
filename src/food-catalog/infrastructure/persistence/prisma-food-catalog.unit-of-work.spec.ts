import { PrismaService } from '../../../database/prisma.service';
import { PrismaFoodCatalogUnitOfWork } from './prisma-food-catalog.unit-of-work';

describe('PrismaFoodCatalogUnitOfWork', () => {
  it('replaces nutrients and servings in the same transaction as the food update', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const deleteNutrients = jest.fn().mockResolvedValue({ count: 2 });
    const createNutrients = jest.fn().mockResolvedValue({ count: 2 });
    const deleteServings = jest.fn().mockResolvedValue({ count: 1 });
    const createServings = jest.fn().mockResolvedValue({ count: 1 });
    const transactionClient = {
      food: { updateMany },
      foodNutrient: { deleteMany: deleteNutrients, createMany: createNutrients },
      foodServing: { deleteMany: deleteServings, createMany: createServings },
    };
    const transaction = jest.fn(
      async (callback: (client: typeof transactionClient) => Promise<void>) =>
        callback(transactionClient),
    );
    const unitOfWork = new PrismaFoodCatalogUnitOfWork({
      $transaction: transaction,
    } as unknown as PrismaService);

    await unitOfWork.update('food-id', {
      nutrients: [{ nutrientDefinitionId: 'energy-id', amount: 250 }],
      servings: [
        {
          name: '1 rebanada',
          quantity: 1,
          unit: 'unidad',
          equivalentGrams: 30,
        },
      ],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteNutrients).toHaveBeenCalledWith({ where: { foodId: 'food-id' } });
    expect(createNutrients).toHaveBeenCalledWith({
      data: [{ foodId: 'food-id', nutrientDefinitionId: 'energy-id', amount: 250 }],
    });
    expect(deleteServings).toHaveBeenCalledWith({ where: { foodId: 'food-id' } });
    expect(createServings).toHaveBeenCalledWith({
      data: [
        {
          foodId: 'food-id',
          name: '1 rebanada',
          quantity: 1,
          unit: 'unidad',
          equivalentGrams: 30,
        },
      ],
    });
  });

  it('performs a logical delete without removing related records', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const deletedAt = new Date('2026-07-30T12:00:00.000Z');
    const unitOfWork = new PrismaFoodCatalogUnitOfWork({
      food: { updateMany },
    } as unknown as PrismaService);

    await unitOfWork.softDelete('food-id', deletedAt);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'food-id',
        householdId: { not: null },
        foodType: 'CUSTOM',
        isGlobal: false,
        isActive: true,
        deletedAt: null,
      },
      data: { isActive: false, deletedAt },
    });
  });
});
