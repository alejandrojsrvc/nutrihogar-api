import Decimal from 'decimal.js';
import { InvalidPurchaseError, InvalidPurchaseStateError } from '../errors/purchase.errors';
import { Purchase } from './purchase';

describe('Purchase', () => {
  it('creates a draft and preserves item snapshots and links', () => {
    const purchase = createPurchase();

    expect(purchase.status).toBe('DRAFT');
    expect(purchase.items[0]).toMatchObject({
      foodId: 'food-id',
      inventoryItemId: 'inventory-id',
      sourceShoppingItemId: 'shopping-item-id',
      nameSnapshot: 'Rice',
      unit: 'UNIT',
    });
    expect(purchase.items[0]?.quantity.equals('2.5')).toBe(true);
  });

  it('supports draft item editing but requires a non-empty purchase to confirm', () => {
    const purchase = createPurchase();
    purchase.updateItem('item-id', { nameSnapshot: ' Brown rice ', quantity: 3 });
    purchase.addItem({ id: 'second-item', nameSnapshot: 'Beans', unit: 'UNIT', quantity: 1 });
    purchase.removeItem('second-item');
    purchase.confirm();

    expect(purchase.status).toBe('CONFIRMED');
    expect(purchase.items[0]?.nameSnapshot).toBe('Brown rice');
    expect(() => purchase.confirm()).toThrow(InvalidPurchaseStateError);
    expect(() => purchase.removeItem('item-id')).toThrow(InvalidPurchaseStateError);
  });

  it('does not allow an empty draft to be confirmed', () => {
    const purchase = createPurchase();
    purchase.removeItem('item-id');

    expect(purchase.items).toHaveLength(0);
    expect(() => purchase.confirm()).toThrow(InvalidPurchaseError);
  });

  it('rejects empty and invalid purchases, and only cancels drafts', () => {
    expect(() => Purchase.create({ ...baseInput(), items: [] })).toThrow(InvalidPurchaseError);
    expect(() => Purchase.create({ ...baseInput(), total: -1 })).toThrow(InvalidPurchaseError);
    expect(() =>
      Purchase.create({ ...baseInput(), items: [{ ...baseInput().items[0], quantity: 0 }] }),
    ).toThrow(InvalidPurchaseError);

    const draft = createPurchase();
    draft.cancel();
    expect(draft.status).toBe('CANCELLED');
    expect(() =>
      draft.addItem({ id: 'new', nameSnapshot: 'Milk', unit: 'L', quantity: 1 }),
    ).toThrow(InvalidPurchaseStateError);

    const confirmed = createPurchase();
    confirmed.confirm();
    expect(() => confirmed.cancel()).toThrow(InvalidPurchaseStateError);
  });
});

function createPurchase(): Purchase {
  return Purchase.create(baseInput());
}

function baseInput() {
  return {
    id: 'purchase-id',
    householdId: 'household-id',
    registeredById: 'user-id',
    storeName: 'Market',
    purchaseDate: new Date('2026-08-01T12:00:00.000Z'),
    currency: 'ars',
    total: new Decimal('12.50'),
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    items: [
      {
        id: 'item-id',
        foodId: 'food-id',
        inventoryItemId: 'inventory-id',
        sourceShoppingItemId: 'shopping-item-id',
        nameSnapshot: 'Rice',
        unit: 'UNIT',
        quantity: new Decimal('2.5'),
      },
    ],
  };
}
