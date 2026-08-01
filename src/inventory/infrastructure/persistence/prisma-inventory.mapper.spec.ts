import { inventoryRecord } from './prisma-inventory.fixture';
import { PrismaInventoryItemMapper } from './prisma-inventory-item.mapper';

describe('PrismaInventoryItemMapper', () => {
  it('round-trips exact decimals and movement metadata without exposing persistence records', () => {
    const record = inventoryRecord();

    const item = PrismaInventoryItemMapper.toDomain(record);
    item.registerWaste('0.000000000001', {
      occurredAt: new Date('2026-07-31T13:00:00.000Z'),
      actorId: '00000000-0000-4000-8000-000000000004',
      sourceType: 'MEAL',
      sourceId: 'meal-1',
      syncOperationId: 'sync-2',
    });
    const persistence = PrismaInventoryItemMapper.toPersistence(item);

    expect(persistence.currentQuantity).toBe('1.123456789122');
    expect(persistence.minimumQuantity).toBe('0.123456789123');
    expect(persistence.movements).toEqual([
      expect.objectContaining({
        quantity: '-1e-12',
        sourceType: 'MEAL',
        sourceId: 'meal-1',
        syncOperationId: 'sync-2',
      }),
    ]);
    expect(record.currentQuantity.toString()).toBe('1.123456789123');
  });
});
