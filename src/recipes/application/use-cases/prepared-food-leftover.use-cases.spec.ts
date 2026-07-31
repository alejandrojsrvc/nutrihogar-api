import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import { RegisterPreparedFoodLeftoverUseCase } from './register-prepared-food-leftover.use-case';
import { ListPreparedFoodLeftoversUseCase } from './list-prepared-food-leftovers.use-case';
import { UpdatePreparedFoodLeftoverStatusUseCase } from './update-prepared-food-leftover-status.use-case';

describe('Prepared food leftover use cases', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let batches: jest.Mocked<PreparedBatchRepository>;
  let leftovers: jest.Mocked<PreparedFoodLeftoverRepository>;
  let save: jest.Mock;
  let list: jest.Mock;
  let updateStatus: jest.Mock;
  let clock: jest.Mocked<Clock>;
  let batch: PreparedBatch;

  beforeEach(() => {
    batch = createFinalizedBatch();
    households = {
      findActiveForUser: jest.fn(),
      findAccess: jest.fn().mockResolvedValue({
        household: { id: 'household-id' },
        role: 'MEMBER',
        status: 'ACTIVE',
      }),
      updateName: jest.fn(),
    };
    batches = {
      findById: jest.fn().mockResolvedValue(batch),
      save: jest.fn(),
      listAvailableByHousehold: jest.fn(),
    };
    save = jest.fn().mockResolvedValue(undefined);
    list = jest.fn().mockResolvedValue([]);
    updateStatus = jest.fn().mockResolvedValue(undefined);
    leftovers = {
      findById: jest.fn(),
      listByPreparedBatchId: jest.fn(),
      list,
      save,
      updateStatus,
    };
    clock = { now: jest.fn().mockReturnValue(now) };
  });

  it('registers a leftover with the batch density snapshot', async () => {
    const result = await new RegisterPreparedFoodLeftoverUseCase(
      households,
      batches,
      leftovers,
      clock,
    ).execute({
      actorId: 'user-id',
      batchId: 'batch-id',
      availableWeight: 750,
      storedAt: now,
      storageLocation: 'REFRIGERATOR',
      notes: 'Guardar para manana',
    });

    expect(result.status).toBe('AVAILABLE');
    expect(result.availableWeight.equals(750)).toBe(true);
    expect(
      result.nutrientDensitySnapshot[0]?.amountPerGram.equals(new Decimal(650).div(1650)),
    ).toBe(true);
    expect(save).toHaveBeenCalledWith(result);
  });

  it('lists leftovers for an accessible household', async () => {
    const result = await new ListPreparedFoodLeftoversUseCase(households, leftovers).execute({
      actorId: 'user-id',
      householdId: 'household-id',
      status: 'AVAILABLE',
    });

    expect(result).toEqual([]);
    expect(list).toHaveBeenCalledWith({
      householdId: 'household-id',
      status: 'AVAILABLE',
    });
  });

  it('marks an available leftover as discarded and preserves the record', async () => {
    const leftover = PreparedFoodLeftover.create({
      id: 'leftover-id',
      preparedBatchId: 'batch-id',
      householdId: 'household-id',
      availableWeight: 750,
      nutrientDensitySnapshot: [],
      storedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    leftovers.findById.mockResolvedValue(leftover);

    const result = await new UpdatePreparedFoodLeftoverStatusUseCase(
      households,
      leftovers,
      clock,
    ).execute({ actorId: 'user-id', leftoverId: 'leftover-id', status: 'DISCARDED' });

    expect(result.status).toBe('DISCARDED');
    expect(result.availableWeight.equals(750)).toBe(true);
    expect(updateStatus).toHaveBeenCalledWith(leftover);
  });
});

const now = new Date('2026-07-31T12:00:00.000Z');

function createFinalizedBatch() {
  const batch = PreparedBatch.start({
    id: 'batch-id',
    householdId: 'household-id',
    recipeId: 'recipe-id',
    recipeNameSnapshot: 'Arroz con pollo',
    preparedAt: now,
    createdById: 'user-id',
    createdAt: now,
    updatedAt: now,
    ingredients: [
      {
        id: 'ingredient-id',
        foodId: 'food-id',
        quantity: new Decimal(500),
        unit: 'GRAM',
        servingId: null,
        position: 1,
        notes: null,
        foodNameSnapshot: null,
        brandSnapshot: null,
        preparationStateSnapshot: null,
        confidenceLevel: null,
        baseQuantity: null,
        baseUnit: null,
        nutrients: [],
      },
    ],
  });
  batch.confirmIngredients(
    [
      {
        ingredientId: 'ingredient-id',
        foodId: 'food-id',
        foodName: 'Rice',
        foodBrand: null,
        preparationState: 'RAW',
        confidenceLevel: 'VERIFIED',
        baseQuantity: 500,
        baseUnit: 'GRAM',
        nutrients: [
          { code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Decimal(650) },
        ],
      },
    ],
    now,
  );
  batch.finalize(1650, now);
  return batch;
}
