/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion */

import Decimal from 'decimal.js';
import {
  InsufficientInventoryError,
  InvalidInventoryQuantityError,
} from '../../domain/errors/inventory.errors';
import {
  PreparedFoodLeftoverNotFoundError,
  PreparedInventoryItemTypeError,
  PreparedInventoryProfileAccessError,
} from '../errors/inventory-application.errors';
import { ConsumePreparedInventoryItemUseCase } from './consume-prepared-inventory-item.use-case';

function setup() {
  const item = {
    id: 'item-1',
    householdId: 'home-1',
    itemType: 'PREPARED_FOOD',
    unit: 'GRAM',
    preparedFoodLeftoverId: 'leftover-1',
    nameSnapshot: 'Guiso',
    currentQuantity: new Decimal(500),
    consume: jest.fn(),
  };
  const households = {
    findAccess: jest.fn().mockResolvedValue({ status: 'ACTIVE', role: 'MEMBER' }),
  };
  const inventory = { findById: jest.fn().mockResolvedValue(item) };
  const leftovers = {
    findById: jest.fn().mockResolvedValue({
      id: 'leftover-1',
      householdId: 'home-1',
      preparedBatchId: 'batch-1',
      availableWeight: new Decimal(500),
      nutrientDensitySnapshot: [
        { code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amountPerGram: new Decimal('1.5') },
      ],
    }),
  };
  const profiles = {
    findActiveById: jest
      .fn()
      .mockResolvedValue({ id: 'profile-1', householdId: 'home-1', isActive: true }),
  };
  const transaction = { consume: jest.fn().mockResolvedValue({ meal: { id: 'meal-1' }, item }) };
  const useCase = new ConsumePreparedInventoryItemUseCase(
    households as never,
    inventory as never,
    leftovers as never,
    profiles as never,
    transaction as never,
  );
  return { useCase, item, households, leftovers, profiles, transaction };
}

const command = (quantity: Decimal.Value = 200) => ({
  actorId: 'user-1',
  inventoryItemId: 'item-1',
  adultProfileId: 'profile-1',
  mealType: 'LUNCH' as const,
  quantity,
  consumedAt: new Date('2026-08-01T12:00:00Z'),
});

describe('ConsumePreparedInventoryItemUseCase', () => {
  it('creates a partial meal using the stored density snapshot', async () => {
    const deps = setup();
    await deps.useCase.execute(command());
    expect(deps.item.consume).toHaveBeenCalledWith(new Decimal(200), expect.any(Object));
    expect(deps.transaction.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        meal: expect.objectContaining({
          source: 'PREPARED_INVENTORY',
          notes: 'Prepared batch batch-1',
        }),
      }),
    );
    expect(deps.transaction.consume.mock.calls[0][0].meal.items[0].nutrients[0].amount).toEqual(
      new Decimal(300),
    );
  });

  it('allows total consumption and rejects excess or non-positive quantities', async () => {
    const deps = setup();
    await deps.useCase.execute(command(500));
    await expect(deps.useCase.execute(command(501))).rejects.toBeInstanceOf(
      InsufficientInventoryError,
    );
    await expect(deps.useCase.execute(command(0))).rejects.toBeInstanceOf(
      InvalidInventoryQuantityError,
    );
  });

  it('rejects non-prepared items and missing leftovers', async () => {
    const deps = setup();
    deps.item.itemType = 'FOOD';
    await expect(deps.useCase.execute(command())).rejects.toBeInstanceOf(
      PreparedInventoryItemTypeError,
    );
    deps.item.itemType = 'PREPARED_FOOD';
    deps.leftovers.findById.mockResolvedValue(null);
    await expect(deps.useCase.execute(command())).rejects.toBeInstanceOf(
      PreparedFoodLeftoverNotFoundError,
    );
  });

  it('requires an active profile in the same household', async () => {
    const deps = setup();
    deps.profiles.findActiveById.mockResolvedValue({
      id: 'profile-1',
      householdId: 'other-home',
      isActive: true,
    });
    await expect(deps.useCase.execute(command())).rejects.toBeInstanceOf(
      PreparedInventoryProfileAccessError,
    );
    expect(deps.transaction.consume).not.toHaveBeenCalled();
  });
});
