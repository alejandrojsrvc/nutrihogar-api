import Decimal from 'decimal.js';
import { ShoppingList } from './shopping-list';
import { InvalidShoppingListItemTransitionError } from '../errors/shopping-list.errors';

describe('ShoppingList', () => {
  const list = () =>
    ShoppingList.create({ id: 'list', householdId: 'home', createdAt: new Date('2026-01-01') });
  it('combines compatible pending manual items by normalized name and unit', () => {
    const shopping = list();
    shopping.addItem({
      id: 'a',
      shoppingListId: 'list',
      name: ' Leche ',
      quantity: 1,
      unit: 'UNIT',
      source: 'MANUAL',
      actorId: 'u1',
      occurredAt: new Date(),
    });
    const item = shopping.addItem({
      id: 'b',
      shoppingListId: 'list',
      name: 'leche',
      quantity: 2,
      unit: 'UNIT',
      source: 'MANUAL',
      actorId: 'u2',
      occurredAt: new Date(),
    });
    expect(shopping.items).toHaveLength(1);
    expect(item.quantity.equals(new Decimal(3))).toBe(true);
  });
  it('keeps removal audit and rejects subsequent transitions', () => {
    const item = list().addItem({
      id: 'a',
      shoppingListId: 'list',
      name: 'Rice',
      quantity: 1,
      unit: 'UNIT',
      source: 'MANUAL',
      actorId: 'u1',
      occurredAt: new Date(),
    });
    item.remove('u2', new Date('2026-01-02'));
    expect(item.toProps().removedById).toBe('u2');
    expect(() => item.markPurchased('u3', new Date())).toThrow(
      InvalidShoppingListItemTransitionError,
    );
  });
  it('finds an existing meal-plan selection so repeated requests are idempotent', () => {
    const shopping = list();
    shopping.addItem({
      id: 'meal-item',
      shoppingListId: 'list',
      foodId: 'food-1',
      name: 'Rice',
      quantity: 2,
      unit: 'GRAM',
      source: 'MEAL_PLAN',
      sourceReferenceId: 'plan-1',
      actorId: 'u1',
      occurredAt: new Date(),
    });
    expect(shopping.findPendingBySource('MEAL_PLAN', 'plan-1', 'food-1', 'GRAM')?.id).toBe(
      'meal-item',
    );
  });
});
