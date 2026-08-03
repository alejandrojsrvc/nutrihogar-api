import Decimal from 'decimal.js';
import {
  ConfirmPreparedBatchInventoryConsumptionUseCase,
  PreviewPreparedBatchInventoryConsumptionUseCase,
} from './prepared-batch-inventory-consumption.use-cases';
import {
  InventoryAccessDeniedError,
  InvalidPreparationConsumptionError,
  PreparedBatchInventoryAlreadyAppliedError,
  PreparedBatchNotFinalizedForInventoryError,
} from '../errors/inventory-application.errors';

const batch = (status = 'FINALIZED') => ({
  id: 'batch-1',
  householdId: 'home-1',
  status,
  ingredients: [
    {
      id: 'ingredient-1',
      foodId: 'food-1',
      quantity: new Decimal(100),
      unit: 'GRAM',
      baseQuantity: new Decimal(100),
      baseUnit: 'GRAM',
    },
  ],
});

function setup(role: 'ADMIN' | 'MEMBER' = 'ADMIN', status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') {
  const households = { findAccess: jest.fn().mockResolvedValue({ role, status, household: {} }) };
  const batches = { findById: jest.fn().mockResolvedValue(batch()) };
  const inventory = {
    findCandidates: jest.fn().mockResolvedValue([
      {
        id: 'item-1',
        foodId: 'food-1',
        currentQuantity: new Decimal(200),
        unit: 'GRAM',
        status: 'ACTIVE',
        location: null,
        expiresAt: null,
      },
    ]),
    hasPreparedBatchConsumption: jest.fn().mockResolvedValue(false),
    confirmPreparedBatchConsumption: jest.fn().mockResolvedValue([]),
  };
  return { households, batches, inventory };
}

describe('prepared batch inventory consumption', () => {
  it('allows an active member to preview compatible active and depleted candidates', async () => {
    const deps = setup('MEMBER');
    const result = await new PreviewPreparedBatchInventoryConsumptionUseCase(
      deps.households as never,
      deps.batches as never,
      deps.inventory as never,
    ).execute('user-1', 'batch-1');
    expect(result.ingredients[0].candidates[0].id).toBe('item-1');
    expect(deps.inventory.findCandidates).toHaveBeenCalledWith('home-1', 'food-1', 'GRAM');
  });

  it('denies preview to an inactive member', async () => {
    const deps = setup('MEMBER', 'INACTIVE');
    await expect(
      new PreviewPreparedBatchInventoryConsumptionUseCase(
        deps.households as never,
        deps.batches as never,
        deps.inventory as never,
      ).execute('user-1', 'batch-1'),
    ).rejects.toBeInstanceOf(InventoryAccessDeniedError);
  });

  it('requires a finalized batch and administrator confirmation', async () => {
    const deps = setup('MEMBER');
    await expect(
      new ConfirmPreparedBatchInventoryConsumptionUseCase(
        deps.households as never,
        deps.batches as never,
        deps.inventory as never,
      ).execute({
        actorId: 'user-1',
        batchId: 'batch-1',
        decisions: [{ ingredientId: 'ingredient-1', action: 'IGNORE' }],
      }),
    ).rejects.toThrow('administrators');
    deps.batches.findById.mockResolvedValue(batch('INGREDIENTS_CONFIRMED'));
    deps.households.findAccess.mockResolvedValue({
      role: 'ADMIN',
      status: 'ACTIVE',
      household: {},
    });
    await expect(
      new ConfirmPreparedBatchInventoryConsumptionUseCase(
        deps.households as never,
        deps.batches as never,
        deps.inventory as never,
      ).execute({
        actorId: 'user-1',
        batchId: 'batch-1',
        decisions: [{ ingredientId: 'ingredient-1', action: 'IGNORE' }],
      }),
    ).rejects.toBeInstanceOf(PreparedBatchNotFinalizedForInventoryError);
  });

  it('requires every ingredient exactly once and does not apply a duplicate', async () => {
    const deps = setup();
    const useCase = new ConfirmPreparedBatchInventoryConsumptionUseCase(
      deps.households as never,
      deps.batches as never,
      deps.inventory as never,
    );
    await expect(
      useCase.execute({ actorId: 'user-1', batchId: 'batch-1', decisions: [] }),
    ).rejects.toBeInstanceOf(InvalidPreparationConsumptionError);
    deps.inventory.hasPreparedBatchConsumption.mockResolvedValue(true);
    await expect(
      useCase.execute({
        actorId: 'user-1',
        batchId: 'batch-1',
        decisions: [{ ingredientId: 'ingredient-1', action: 'IGNORE' }],
      }),
    ).rejects.toBeInstanceOf(PreparedBatchInventoryAlreadyAppliedError);
  });

  it('passes the exact snapshot quantity and candidate to the atomic port', async () => {
    const deps = setup();
    await new ConfirmPreparedBatchInventoryConsumptionUseCase(
      deps.households as never,
      deps.batches as never,
      deps.inventory as never,
    ).execute({
      actorId: 'user-1',
      batchId: 'batch-1',
      decisions: [{ ingredientId: 'ingredient-1', action: 'CONSUME', inventoryItemId: 'item-1' }],
    });
    expect(deps.inventory.confirmPreparedBatchConsumption).toHaveBeenCalledWith(
      expect.objectContaining({
        decisions: [
          {
            ingredientId: 'ingredient-1',
            action: 'CONSUME',
            inventoryItemId: 'item-1',
            quantity: '100',
            unit: 'GRAM',
          },
        ],
      }),
    );
  });
});
