/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */

import Decimal from 'decimal.js';
import { Purchase } from '../../domain/entities/purchase';
import {
  CreatePurchaseFromShoppingListUseCase,
  CreatePurchaseUseCase,
  ConfirmPurchaseUseCase,
} from './purchase.use-cases';

describe('purchase use cases', () => {
  const household = { id: 'household-id', currency: 'ARS' };
  const access = { household, role: 'ADMIN', status: 'ACTIVE' } as any;
  const households = { findAccess: jest.fn().mockResolvedValue(access) } as any;

  it('creates a draft using household currency and returns an existing idempotent purchase', async () => {
    const purchases = {
      findByIdempotencyKey: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(Purchase.create(input())),
      save: jest.fn(),
    } as any;
    const useCase = new CreatePurchaseUseCase(households, purchases);
    const first = await useCase.execute({
      ...input(),
      actorId: 'user-id',
      householdId: 'household-id',
      idempotencyKey: 'request-1',
      currency: undefined,
    });
    const second = await useCase.execute({
      ...input(),
      actorId: 'user-id',
      householdId: 'household-id',
      idempotencyKey: 'request-1',
      currency: undefined,
    });
    expect(first.status).toBe('DRAFT');
    expect(first.currency).toBe('ARS');
    expect(second.id).toBe('purchase-id');
    expect(purchases.save).toHaveBeenCalledTimes(1);
  });

  it('confirms through the transaction port only once and does not confirm for members', async () => {
    const purchase = Purchase.create(input());
    const purchases = { findById: jest.fn().mockResolvedValue(purchase) } as any;
    const foods = {
      findVisibleById: jest
        .fn()
        .mockResolvedValue({ id: 'food-id', name: 'Rice', referenceUnit: 'UNIT', isGlobal: true }),
    } as any;
    const inventory = {
      listByHousehold: jest.fn().mockResolvedValue({ items: [] }),
      findById: jest.fn(),
    } as any;
    const transaction = {
      confirm: jest.fn().mockImplementation(async ({ purchase: value }: { purchase: Purchase }) => {
        value.confirm();
        return value;
      }),
    } as any;
    const useCase = new ConfirmPurchaseUseCase(
      households,
      purchases,
      foods,
      inventory,
      transaction,
    );
    const result = await useCase.execute({ actorId: 'user-id', purchaseId: 'purchase-id' });
    expect(result.status).toBe('CONFIRMED');
    expect(transaction.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ quantity: '2', unit: 'UNIT' })],
      }),
    );
    households.findAccess.mockResolvedValueOnce({ ...access, role: 'MEMBER' });
    await expect(
      useCase.execute({ actorId: 'user-id', purchaseId: 'purchase-id' }),
    ).rejects.toThrow('administrator');
  });

  it('converts selected pending items without changing their state', async () => {
    const item = {
      id: 'shopping-id',
      status: 'PENDING',
      foodId: null,
      name: 'Milk',
      unit: 'UNIT',
      quantity: new Decimal(2),
    };
    const list = { findItem: jest.fn().mockReturnValue(item) };
    const lists = { findByHousehold: jest.fn().mockResolvedValue(list) } as any;
    const purchases = { findByIdempotencyKey: jest.fn().mockResolvedValue(null) } as any;
    const created = Purchase.create(input());
    const create = { execute: jest.fn().mockResolvedValue(created) } as any;
    const useCase = new CreatePurchaseFromShoppingListUseCase(households, lists, purchases, create);
    await useCase.execute({
      actorId: 'user-id',
      householdId: 'household-id',
      itemIds: ['shopping-id'],
      storeName: 'Market',
      purchaseDate: new Date(),
      total: 2,
      idempotencyKey: 'key-1',
    });
    expect(create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'key-1',
        items: [expect.objectContaining({ sourceShoppingItemId: 'shopping-id', quantity: '2' })],
      }),
    );
    expect(item.status).toBe('PENDING');
  });
});

function input() {
  return {
    id: 'purchase-id',
    householdId: 'household-id',
    registeredById: 'user-id',
    storeName: 'Market',
    purchaseDate: new Date('2026-08-01T12:00:00Z'),
    currency: 'ARS',
    total: '10.25',
    createdAt: new Date('2026-08-01T12:00:00Z'),
    items: [
      { id: 'item-id', foodId: 'food-id', nameSnapshot: 'Rice', unit: 'UNIT', quantity: '2' },
    ],
  };
}
