import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { Purchase } from '../../domain/entities/purchase';
import { PrismaPurchaseMapper } from './prisma-purchase.mapper';

describe('PrismaPurchaseMapper', () => {
  it('maps Decimal values and item snapshots in both directions', () => {
    const purchase = Purchase.create({
      id: 'purchase-id',
      householdId: 'household-id',
      registeredById: 'user-id',
      storeName: 'Market',
      purchaseDate: new Date('2026-08-01T12:00:00.000Z'),
      currency: 'ARS',
      total: new Decimal('10.25'),
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
      items: [{ id: 'item-id', nameSnapshot: 'Rice', unit: 'UNIT', quantity: '2.5' }],
    });
    const persistence = PrismaPurchaseMapper.toPersistence(purchase);

    expect(persistence.total).toBe('10.25');
    expect(persistence.items[0]).toMatchObject({ purchaseId: 'purchase-id', quantity: '2.5' });
    const result = PrismaPurchaseMapper.toDomain({
      ...persistence,
      total: new Prisma.Decimal(persistence.total),
      items: persistence.items.map((item) => ({
        ...item,
        quantity: new Prisma.Decimal(item.quantity),
      })),
    });
    expect(result.total.equals('10.25')).toBe(true);
    expect(result.items[0]?.quantity.equals('2.5')).toBe(true);
  });
});
