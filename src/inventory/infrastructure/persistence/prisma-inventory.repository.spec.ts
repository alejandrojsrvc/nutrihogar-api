/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { InventoryItem } from '../../domain/entities/inventory-item';
import {
  DuplicateInventoryOperationError,
  InventoryVersionConflictError,
} from '../../domain/errors/inventory.errors';
import { inventoryRecord } from './prisma-inventory.fixture';
import { PrismaInventoryItemMapper } from './prisma-inventory-item.mapper';
import { PrismaInventoryRepository } from './prisma-inventory.repository';

describe('PrismaInventoryRepository', () => {
  it('atomically creates an item with its initial movement and marks it persisted', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const transactionClient = client({ inventoryItem: { create } });
    const transaction = jest.fn(async (work: (client: unknown) => Promise<void>) =>
      work(transactionClient),
    );
    const repository = new PrismaInventoryRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const item = newItem();

    await repository.save(item);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: item.id,
        movements: {
          create: [expect.objectContaining({ type: 'MANUAL_ENTRY', quantity: '2.5' })],
        },
      }),
    });
    expect(item.pendingMovements).toHaveLength(0);
    expect(item.isNew).toBe(false);
  });

  it('compares the persisted version before inserting pending movements', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const transactionClient = client({
      inventoryItem: { updateMany },
      inventoryMovement: { createMany },
    });
    const transaction = jest.fn(async (work: (client: unknown) => Promise<void>) =>
      work(transactionClient),
    );
    const repository = new PrismaInventoryRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const item = PrismaInventoryItemMapper.toDomain(inventoryRecord());
    item.consume('0.123456789123', {
      occurredAt: new Date('2026-07-31T13:00:00.000Z'),
      syncOperationId: 'sync-update',
    });

    await repository.save(item);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ version: 3 }) }),
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ quantity: '-0.123456789123' })],
    });
    expect(item.version).toBe(4);
  });

  it('aborts before movement insertion on an optimistic version conflict', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const createMany = jest.fn();
    const transactionClient = client({
      inventoryItem: { updateMany },
      inventoryMovement: { createMany },
    });
    const transaction = jest.fn(async (work: (client: unknown) => Promise<void>) =>
      work(transactionClient),
    );
    const repository = new PrismaInventoryRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const record = inventoryRecord();
    const item = PrismaInventoryItemMapper.toDomain(record);
    item.consume(1, {
      occurredAt: new Date('2026-07-31T13:00:00.000Z'),
      syncOperationId: 'conflict',
    });

    await expect(repository.save(item)).rejects.toBeInstanceOf(InventoryVersionConflictError);
    expect(createMany).not.toHaveBeenCalled();
    expect(item.pendingMovements).toHaveLength(1);
  });

  it('translates a concurrent duplicate sync operation and keeps the movement pending', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['sync_operation_id'] },
    });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockRejectedValue(duplicate);
    const transactionClient = client({
      inventoryItem: { updateMany },
      inventoryMovement: { createMany },
    });
    const transaction = jest.fn(async (work: (client: unknown) => Promise<void>) =>
      work(transactionClient),
    );
    const repository = new PrismaInventoryRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const item = PrismaInventoryItemMapper.toDomain(inventoryRecord());
    item.consume(1, {
      occurredAt: new Date('2026-07-31T13:00:00.000Z'),
      syncOperationId: 'concurrent-duplicate',
    });

    await expect(repository.save(item)).rejects.toBeInstanceOf(DuplicateInventoryOperationError);
    expect(item.pendingMovements).toHaveLength(1);
  });

  it('builds household list filters and paginates below-minimum items', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const minimumQuantity = Symbol('minimumQuantity');
    const repository = new PrismaInventoryRepository(
      client({
        inventoryItem: { findMany, count, fields: { minimumQuantity } },
      }) as unknown as PrismaService,
    );
    const expiresBefore = new Date('2026-08-01T00:00:00.000Z');

    await repository.listByHousehold('household-id', {
      query: 'rice',
      itemType: 'FOOD',
      status: 'ACTIVE',
      location: 'Pantry',
      belowMinimum: true,
      expiresBefore,
      page: 2,
      limit: 10,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        householdId: 'household-id',
        nameSnapshot: { contains: 'rice', mode: 'insensitive' },
        itemType: 'FOOD',
        status: 'ACTIVE',
        location: { equals: 'Pantry', mode: 'insensitive' },
        minimumQuantity: { not: null },
        currentQuantity: { lte: minimumQuantity },
        expiresAt: { lte: expiresBefore },
      },
      include: expect.any(Object),
      orderBy: [{ expiresAt: 'asc' }, { nameSnapshot: 'asc' }, { id: 'asc' }],
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({ householdId: 'household-id' }),
    });
  });
});

function newItem(): InventoryItem {
  const now = new Date('2026-07-31T12:00:00.000Z');
  return InventoryItem.create({
    id: '00000000-0000-4000-8000-000000000001',
    householdId: '00000000-0000-4000-8000-000000000002',
    foodId: null,
    preparedFoodLeftoverId: null,
    nameSnapshot: 'Rice',
    itemType: 'CUSTOM',
    initialQuantity: '2.5',
    unit: 'GRAM',
    createdAt: now,
    initialMovement: { occurredAt: now, syncOperationId: 'initial' },
  });
}

function client(overrides: Record<string, object>) {
  return {
    inventoryItem: { fields: { minimumQuantity: Symbol('minimumQuantity') } },
    inventoryMovement: {},
    ...overrides,
  };
}
