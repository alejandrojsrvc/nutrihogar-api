import Decimal from 'decimal.js';
import { AddPreparedLeftoverToInventoryUseCase } from './add-prepared-leftover-to-inventory.use-case';
import {
  InventoryAdminRequiredError,
  InvalidPreparationConsumptionError,
} from '../errors/inventory-application.errors';

const leftover = (status = 'AVAILABLE') => ({
  id: 'leftover-1',
  householdId: 'home-1',
  preparedBatchId: 'batch-1',
  status,
  availableWeight: new Decimal(250),
  storageLocation: 'fridge',
});

describe('add prepared leftover to inventory', () => {
  it('requires an administrator and delegates the full snapshot to the transaction port', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', household: {} }),
    };
    const leftovers = { findById: jest.fn().mockResolvedValue(leftover()) };
    const batches = {
      findById: jest.fn().mockResolvedValue({ householdId: 'home-1', recipeNameSnapshot: 'Soup' }),
    };
    const inventory = { addPreparedLeftover: jest.fn().mockResolvedValue({ id: 'item-1' }) };
    const result = await new AddPreparedLeftoverToInventoryUseCase(
      households as never,
      leftovers as never,
      batches as never,
      inventory as never,
    ).execute({ actorId: 'admin-1', leftoverId: 'leftover-1' });
    expect(result.id).toBe('item-1');
    expect(inventory.addPreparedLeftover).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: '250',
        name: 'Soup',
        location: 'fridge',
        leftoverId: 'leftover-1',
      }),
    );
  });

  it('rejects a member, closed leftover, and cross-household batch', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE', household: {} }),
    };
    const leftovers = { findById: jest.fn().mockResolvedValue(leftover()) };
    const batches = {
      findById: jest.fn().mockResolvedValue({ householdId: 'home-1', recipeNameSnapshot: 'Soup' }),
    };
    const inventory = { addPreparedLeftover: jest.fn() };
    await expect(
      new AddPreparedLeftoverToInventoryUseCase(
        households as never,
        leftovers as never,
        batches as never,
        inventory as never,
      ).execute({ actorId: 'member-1', leftoverId: 'leftover-1' }),
    ).rejects.toBeInstanceOf(InventoryAdminRequiredError);
    households.findAccess.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', household: {} });
    leftovers.findById.mockResolvedValue(leftover('CONSUMED'));
    await expect(
      new AddPreparedLeftoverToInventoryUseCase(
        households as never,
        leftovers as never,
        batches as never,
        inventory as never,
      ).execute({ actorId: 'admin-1', leftoverId: 'leftover-1' }),
    ).rejects.toBeInstanceOf(InvalidPreparationConsumptionError);
  });
});
