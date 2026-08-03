import Decimal from 'decimal.js';
import { InventoryItemRecord } from './prisma-inventory.types';

export function inventoryRecord(overrides: Partial<InventoryItemRecord> = {}): InventoryItemRecord {
  const createdAt = new Date('2026-07-31T12:00:00.000Z');
  return {
    id: '00000000-0000-4000-8000-000000000001',
    householdId: '00000000-0000-4000-8000-000000000002',
    foodId: null,
    preparedFoodLeftoverId: null,
    nameSnapshot: 'Rice',
    itemType: 'CUSTOM',
    currentQuantity: new Decimal('1.123456789123'),
    unit: 'GRAM',
    minimumQuantity: new Decimal('0.123456789123'),
    location: 'Pantry',
    expiresAt: null,
    status: 'ACTIVE',
    version: 3,
    createdAt,
    updatedAt: createdAt,
    movements: [
      {
        id: '00000000-0000-4000-8000-000000000003',
        itemId: '00000000-0000-4000-8000-000000000001',
        type: 'MANUAL_ENTRY',
        quantity: new Decimal('1.123456789123'),
        unit: 'GRAM',
        occurredAt: createdAt,
        sourceType: null,
        sourceId: null,
        reason: null,
        actorId: null,
        deviceId: null,
        syncOperationId: 'sync-1',
        createdAt,
      },
    ],
    ...overrides,
  };
}
