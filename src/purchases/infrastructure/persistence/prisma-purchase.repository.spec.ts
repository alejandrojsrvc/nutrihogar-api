/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { Purchase } from '../../domain/entities/purchase';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { HouseholdId } from '../../domain/value-objects/household-id';
import { PrismaPurchaseRepository } from './prisma-purchase.repository';

describe('PrismaPurchaseRepository', () => {
  it('saves the aggregate and replaces items in one transaction', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const deleteMany = jest.fn().mockResolvedValue(undefined);
    const createMany = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({ purchase: { upsert }, purchaseItem: { deleteMany, createMany } }),
    );
    const repository = new PrismaPurchaseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.save(createPurchase());

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      create: { id: 'purchase-id', total: '10.25' },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { purchaseId: 'purchase-id' } });
    expect(createMany.mock.calls[0]?.[0].data[0]).toMatchObject({
      nameSnapshot: 'Rice',
      quantity: '2',
    });
  });

  it('reads and paginates household purchases without exposing Prisma records', async () => {
    const record = {
      ...createPurchaseRecord(),
      total: new Prisma.Decimal('10.25'),
      items: [{ ...createPurchaseRecord().items[0], quantity: new Prisma.Decimal('2') }],
    };
    const findMany = jest.fn().mockResolvedValue([record]);
    const count = jest.fn().mockResolvedValue(1);
    const repository = new PrismaPurchaseRepository({
      purchase: { findUnique: jest.fn(), findMany, count },
    } as unknown as PrismaService);

    const result = await repository.listByHousehold(HouseholdId.from('household-id'), {
      status: 'CANCELLED',
      page: 2,
      limit: 10,
    });

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { householdId: 'household-id', status: 'CANCELLED' },
      skip: 10,
      take: 10,
    });
    expect(result.items[0]).toBeInstanceOf(Purchase);
    expect(result.items[0]?.total.equals('10.25')).toBe(true);
    expect(result.total).toBe(1);
  });

  it('finds a purchase by its domain id', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...createPurchaseRecord(),
      total: new Prisma.Decimal('10.25'),
      items: [{ ...createPurchaseRecord().items[0], quantity: new Prisma.Decimal('2') }],
    });
    const repository = new PrismaPurchaseRepository({
      purchase: { findUnique },
    } as unknown as PrismaService);

    const result = await repository.findById(PurchaseId.from('purchase-id'));

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'purchase-id' } }),
    );
    expect(result?.id).toBe('purchase-id');
  });
});

function createPurchase(): Purchase {
  return Purchase.create({
    id: 'purchase-id',
    householdId: 'household-id',
    registeredById: 'user-id',
    storeName: 'Market',
    purchaseDate: new Date('2026-08-01T12:00:00.000Z'),
    currency: 'ARS',
    total: '10.25',
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    items: [{ id: 'item-id', nameSnapshot: 'Rice', unit: 'UNIT', quantity: 2 }],
  });
}

function createPurchaseRecord() {
  return {
    id: 'purchase-id',
    householdId: 'household-id',
    registeredById: 'user-id',
    storeName: 'Market',
    purchaseDate: new Date('2026-08-01T12:00:00.000Z'),
    status: 'CANCELLED' as const,
    currency: 'ARS',
    total: { toString: () => '10.25' },
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    items: [
      {
        id: 'item-id',
        purchaseId: 'purchase-id',
        foodId: null,
        inventoryItemId: null,
        sourceShoppingItemId: null,
        nameSnapshot: 'Rice',
        unit: 'UNIT',
        quantity: { toString: () => '2' },
      },
    ],
  };
}
