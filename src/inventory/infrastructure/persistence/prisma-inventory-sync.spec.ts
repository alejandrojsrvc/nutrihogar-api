import { PrismaInventoryRepository } from './prisma-inventory.repository';

describe('PrismaInventoryRepository inventory sync transaction', () => {
  it('uses one interactive transaction for one operation result', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      $transaction: jest.fn(async (work: (client: unknown) => Promise<unknown>) =>
        work({ inventorySyncOperation: { create, findUnique: jest.fn() } }),
      ),
    };
    const repository = new PrismaInventoryRepository(prisma as never);

    await repository.execute(async (transaction) => {
      await transaction.recordOperation({
        operationId: 'operation-1',
        householdId: 'household-1',
        inventoryItemId: 'item-1',
        actorId: 'actor-1',
        deviceId: 'device-1',
        status: 'CONFLICT',
        reason: 'ITEM_NOT_FOUND',
        resultingVersion: null,
        snapshot: null,
        createdAt: new Date(),
      });
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
