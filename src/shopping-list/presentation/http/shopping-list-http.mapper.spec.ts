import { ShoppingList } from '../../domain/entities/shopping-list';
import { toListResponse } from './shopping-list-http.mapper';

describe('shopping list HTTP mapper', () => {
  it('serializes decimal quantities and audit fields', () => {
    const list = ShoppingList.create({ id: 'list', householdId: 'home', createdAt: new Date() });
    const item = list.addItem({
      id: 'item',
      shoppingListId: 'list',
      name: 'Flour',
      quantity: '1.25',
      unit: 'GRAM',
      source: 'MANUAL',
      actorId: 'user',
      occurredAt: new Date(),
    });
    item.remove('user-2', new Date('2026-01-02'));
    const response = toListResponse(list);
    expect(response.items[0]).toMatchObject({
      quantity: 1.25,
      status: 'REMOVED',
      removedById: 'user-2',
    });
  });
});
