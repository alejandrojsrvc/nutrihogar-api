import Decimal from 'decimal.js';
import {
  ArchivedInventoryItemError,
  DuplicateInventoryOperationError,
  InsufficientInventoryError,
  InventoryMovementInvariantError,
} from '../errors/inventory.errors';
import { InventoryItem } from './inventory-item';
import { InventoryMovement } from './inventory-movement';

const occurredAt = new Date('2026-07-31T12:00:00.000Z');

describe('InventoryItem', () => {
  it('creates with an exact initial movement and exposes movement snapshots immutably', () => {
    const item = createItem('1.123456789123');

    expect(item.currentQuantity.eq('1.123456789123')).toBe(true);
    expect(item.status).toBe('ACTIVE');
    expect(item.movements).toHaveLength(1);
    expect(item.movements[0].quantity.eq('1.123456789123')).toBe(true);
    expect(item.movements[0].toProps().type).toBe('MANUAL_ENTRY');
    expect(Object.isFrozen(item.movements)).toBe(true);

    const exposed = item.movements[0].toProps();
    exposed.quantity = new Decimal(999);
    expect(item.movements[0].quantity.eq('1.123456789123')).toBe(true);
  });

  it('records entries and exits as signed deltas and reactivates a depleted item', () => {
    const item = createItem(5);
    item.consume(5, metadata('consume'));
    expect(item.currentQuantity.isZero()).toBe(true);
    expect(item.status).toBe('DEPLETED');
    expect(item.movements[1].quantity.eq(-5)).toBe(true);

    item.registerPurchase('2.5', metadata('purchase'));
    item.increase('0.25', metadata('increase'));
    item.decrease('0.5', metadata('decrease'));
    item.registerWaste('0.25', metadata('waste'));
    item.registerExpiration('0.5', metadata('expiration'));
    item.returnRemainder('0.5', metadata('remainder'));
    item.registerPreparationConsumption('0.5', metadata('preparation'));

    expect(item.currentQuantity.eq('1.5')).toBe(true);
    expect(item.status).toBe('ACTIVE');
    expect(item.movements.map((movement) => movement.toProps().type)).toEqual([
      'MANUAL_ENTRY',
      'CONSUMPTION',
      'PURCHASE',
      'ADJUSTMENT_INCREASE',
      'ADJUSTMENT_DECREASE',
      'WASTE',
      'EXPIRATION',
      'REMAINDER_RETURN',
      'PREPARATION_CONSUMPTION',
    ]);
  });

  it('turns absolute adjustments into one exact difference movement', () => {
    const item = createItem('10.000000000001');
    item.adjustTo('7.000000000000', metadata('adjust'));

    expect(item.currentQuantity.eq('7.000000000000')).toBe(true);
    expect(item.movements[1].quantity.eq('-3.000000000001')).toBe(true);
    expect(item.movements[1].toProps().type).toBe('ADJUSTMENT_DECREASE');
  });

  it('rejects negative results, archived movements and duplicate sync operations', () => {
    const item = createItem(2);
    expect(() => item.consume(3, metadata('too-much'))).toThrow(InsufficientInventoryError);

    item.consume(1, metadata('same-operation'));
    expect(() => item.registerWaste(1, metadata('same-operation'))).toThrow(
      DuplicateInventoryOperationError,
    );

    item.archive(occurredAt);
    expect(() => item.increase(1, metadata('after-archive'))).toThrow(ArchivedInventoryItemError);
  });

  it('rejects persisted state whose movement sum differs from the quantity', () => {
    const item = createItem(4);
    const props = item.toProps();
    const movement = InventoryMovement.create(item.movements[0].toProps());

    expect(() =>
      InventoryItem.reconstitute({ ...props, currentQuantity: new Decimal(3) }, [movement]),
    ).toThrow(InventoryMovementInvariantError);
  });
});

function createItem(initialQuantity: Decimal.Value): InventoryItem {
  return InventoryItem.create({
    id: '00000000-0000-4000-8000-000000000001',
    householdId: '00000000-0000-4000-8000-000000000002',
    foodId: null,
    preparedFoodLeftoverId: null,
    nameSnapshot: 'Rice',
    itemType: 'CUSTOM',
    initialQuantity,
    unit: 'GRAM',
    minimumQuantity: 0,
    location: 'Pantry',
    expiresAt: null,
    createdAt: occurredAt,
    initialMovement: metadata('initial'),
  });
}

function metadata(syncOperationId: string) {
  return { occurredAt, syncOperationId };
}
