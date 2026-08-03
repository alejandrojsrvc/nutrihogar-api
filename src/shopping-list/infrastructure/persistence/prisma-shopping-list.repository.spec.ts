import Decimal from 'decimal.js';
import { PrismaShoppingListRepository } from './prisma-shopping-list.repository';
import { ShoppingList } from '../../domain/entities/shopping-list';

describe('PrismaShoppingListRepository', () => {
  it('does not send shopping-list fields to shopping-list items', async () => {
    const upsert = jest.fn();
    const deleteMany = jest.fn();
    let createManyInput: { data: Array<Record<string, unknown>> } | undefined;
    const createMany = jest.fn((input: { data: Array<Record<string, unknown>> }) => {
      createManyInput = input;
    });
    const transaction = jest.fn(async (callback: (client: unknown) => Promise<void>) =>
      callback({
        shoppingList: { upsert },
        shoppingListItem: { deleteMany, createMany },
      }),
    );
    const repository = new PrismaShoppingListRepository({ $transaction: transaction } as never);
    const list = ShoppingList.create({
      id: 'list-id',
      householdId: 'household-id',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    list.addItem({
      id: 'item-id',
      shoppingListId: 'list-id',
      name: 'Flour',
      quantity: new Decimal(2),
      unit: 'UNIT',
      source: 'MANUAL',
      actorId: 'actor-id',
      occurredAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    await repository.save(list);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'item-id',
          shoppingListId: 'list-id',
          name: 'Flour',
          quantity: '2',
        }),
      ],
    });
    expect(createManyInput?.data[0]).not.toHaveProperty('householdId');
  });
});
