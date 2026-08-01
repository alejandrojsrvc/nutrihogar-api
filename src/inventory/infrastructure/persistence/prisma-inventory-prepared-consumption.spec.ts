import Decimal from 'decimal.js';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { PrismaInventoryRepository } from './prisma-inventory.repository';

describe('PrismaInventoryRepository prepared consumption transaction', () => {
  it('writes the meal and inventory movement in the same Prisma transaction', async () => {
    const meal = {
      id: 'meal-1',
      householdId: 'home-1',
      adultProfileId: 'profile-1',
      mealType: 'LUNCH',
      consumedAt: new Date(),
      status: 'CONFIRMED',
      source: 'PREPARED_INVENTORY',
      notes: 'batch',
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      items: [
        {
          id: 'meal-item-1',
          foodId: null,
          foodServingId: null,
          nameSnapshot: 'Guiso',
          brandSnapshot: null,
          preparationStateSnapshot: 'READY_TO_EAT',
          quantity: new Decimal(100),
          unit: 'GRAM',
          baseQuantity: new Decimal(100),
          baseUnit: 'GRAM',
          measurementMethod: 'WEIGHED',
          confidenceLevel: 'VERIFIED',
          nutrientSnapshots: [],
        },
      ],
    };
    const transaction = {
      meal: { create: jest.fn().mockResolvedValue(meal) },
      inventoryItem: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      inventoryMovement: { createMany: jest.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    };
    const item = InventoryItem.create({
      id: 'item-1',
      householdId: 'home-1',
      foodId: null,
      preparedFoodLeftoverId: 'leftover-1',
      nameSnapshot: 'Guiso',
      itemType: 'PREPARED_FOOD',
      initialQuantity: 500,
      unit: 'GRAM',
      createdAt: new Date(),
      initialMovement: { type: 'REMAINDER_RETURN', occurredAt: new Date() },
    });
    item.markPersisted(0);
    item.consume(100, {
      occurredAt: new Date(),
      actorId: 'user-1',
      sourceType: 'PREPARED_INVENTORY',
      sourceId: 'batch-1',
    });

    const result = await new PrismaInventoryRepository(prisma as never).consume({
      item,
      meal: {
        householdId: 'home-1',
        adultProfileId: 'profile-1',
        mealType: 'LUNCH',
        consumedAt: new Date(),
        notes: 'batch',
        createdById: 'user-1',
        source: 'PREPARED_INVENTORY',
        items: [],
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.meal.create).toHaveBeenCalledTimes(1);
    expect(transaction.inventoryItem.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.inventoryMovement.createMany).toHaveBeenCalledTimes(1);
    expect(result.meal.id).toBe('meal-1');
  });
});
