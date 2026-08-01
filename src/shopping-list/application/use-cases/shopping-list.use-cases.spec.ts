/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import Decimal from 'decimal.js';
import { ShoppingList } from '../../domain/entities/shopping-list';
import {
  AddShoppingListItemUseCase,
  GenerateInventoryShoppingListItemsUseCase,
} from './shopping-list.use-cases';

describe('shopping list use cases', () => {
  const household = { findAccess: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) } as any;
  const list = ShoppingList.create({ id: 'list', householdId: 'home', createdAt: new Date() });
  it('combines manual entries through the shared household list', async () => {
    const repository = {
      findByHousehold: jest.fn().mockResolvedValue(list),
      save: jest.fn(),
    } as any;
    const useCase = new AddShoppingListItemUseCase(household, repository);
    await useCase.execute({
      actorId: 'u1',
      householdId: 'home',
      name: 'Milk',
      quantity: 1,
      unit: 'UNIT',
    });
    await useCase.execute({
      actorId: 'u2',
      householdId: 'home',
      name: ' milk ',
      quantity: 2,
      unit: 'UNIT',
    });
    expect(list.items).toHaveLength(1);
    expect(list.items[0].quantity.equals(new Decimal(3))).toBe(true);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('generates only active food/custom shortages and remains idempotent', async () => {
    const source = (props: any) => ({
      toProps: () => ({
        id: props.id,
        householdId: 'home',
        foodId: props.foodId ?? null,
        nameSnapshot: props.name,
        itemType: props.type,
        currentQuantity: new Decimal(props.current),
        unit: 'UNIT',
        minimumQuantity: props.minimum === null ? null : new Decimal(props.minimum),
        status: props.status,
      }),
    });
    const inventory = {
      listByHousehold: jest.fn().mockResolvedValue({
        items: [
          source({
            id: 'a',
            name: 'Eggs',
            type: 'FOOD',
            foodId: 'food',
            current: 0,
            minimum: 6,
            status: 'DEPLETED',
          }),
          source({
            id: 'b',
            name: 'Soup',
            type: 'PREPARED_FOOD',
            current: 0,
            minimum: 2,
            status: 'DEPLETED',
          }),
        ],
      }),
    } as any;
    const repository = {
      findByHousehold: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    } as any;
    const useCase = new GenerateInventoryShoppingListItemsUseCase(household, repository, inventory);
    const result = await useCase.execute('u1', 'home');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity.equals(new Decimal(6))).toBe(true);
    expect(result.items[0].source).toBe('DEPLETED');
  });

  it('does not permit access to another household', async () => {
    household.findAccess.mockResolvedValueOnce(null);
    const useCase = new AddShoppingListItemUseCase(household, {
      findByHousehold: jest.fn(),
    } as any);
    await expect(
      useCase.execute({
        actorId: 'u1',
        householdId: 'other',
        name: 'Milk',
        quantity: 1,
        unit: 'UNIT',
      }),
    ).rejects.toThrow();
  });
});
