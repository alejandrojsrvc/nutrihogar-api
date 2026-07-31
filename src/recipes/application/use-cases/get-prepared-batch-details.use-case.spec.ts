import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { ServedPortion } from '../../domain/entities/served-portion';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import {
  PreparedBatchAvailabilityRepository,
  ServedPortionRepository,
} from '../ports/served-portion-repository.port';
import { GetPreparedBatchDetailsUseCase } from './get-prepared-batch-details.use-case';

const now = new Date('2026-07-31T12:00:00.000Z');

describe('GetPreparedBatchDetailsUseCase', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let batches: jest.Mocked<PreparedBatchRepository>;
  let availability: jest.Mocked<PreparedBatchAvailabilityRepository>;
  let portions: jest.Mocked<ServedPortionRepository>;
  let leftovers: jest.Mocked<PreparedFoodLeftoverRepository>;
  let getAvailability: jest.Mock;
  let findByPreparedBatchId: jest.Mock;
  let listByPreparedBatchId: jest.Mock;
  const batch = createFinalizedBatch();
  const portion = ServedPortion.create({
    id: 'portion-id',
    preparedBatchId: 'batch-id',
    adultProfileId: 'adult-id',
    servedWeight: 520,
    servedAt: now,
    createdById: 'user-id',
    createdAt: now,
    updatedAt: now,
  });
  const leftover = PreparedFoodLeftover.create({
    id: 'leftover-id',
    preparedBatchId: 'batch-id',
    householdId: 'household-id',
    availableWeight: 500,
    nutrientDensitySnapshot: [],
    storedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  beforeEach(() => {
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
    getAvailability = jest.fn().mockResolvedValue({
      finalCookedWeight: new Decimal(1650),
      servedWeight: new Decimal(900),
      storedLeftoverWeight: new Decimal(500),
      savedRemainderWeight: new Decimal(40),
      discardedWeight: new Decimal(0),
      availableWeight: new Decimal(250),
    });
    availability = { getAvailability };
    findByPreparedBatchId = jest.fn().mockResolvedValue([portion]);
    portions = {
      findById: jest.fn(),
      findByPreparedBatchId,
      save: jest.fn(),
      sumAllocatedWeight: jest.fn(),
    };
    listByPreparedBatchId = jest.fn().mockResolvedValue([leftover]);
    leftovers = {
      findById: jest.fn(),
      listByPreparedBatchId,
      list: jest.fn(),
      save: jest.fn(),
      updateStatus: jest.fn(),
    };
  });

  it('returns the batch, operational availability, all portions and all leftovers', async () => {
    const result = await createUseCase().execute('user-id', 'batch-id');

    expect(result.batch).toBe(batch);
    expect(result.availability?.availableWeight.equals(250)).toBe(true);
    expect(result.servedPortions).toEqual([portion]);
    expect(result.leftovers).toEqual([leftover]);
    expect(findByPreparedBatchId).toHaveBeenCalledWith('batch-id');
    expect(listByPreparedBatchId).toHaveBeenCalledWith('batch-id');
  });

  it('keeps availability null for a draft batch while returning empty operational collections', async () => {
    const draftBatch = PreparedBatch.start({
      ...batch.toProps(),
    });
    batches.findById.mockResolvedValue(draftBatch);
    getAvailability.mockResolvedValue(null);
    findByPreparedBatchId.mockResolvedValue([]);
    listByPreparedBatchId.mockResolvedValue([]);

    const result = await createUseCase().execute('user-id', 'batch-id');

    expect(result.availability).toBeNull();
    expect(result.servedPortions).toEqual([]);
    expect(result.leftovers).toEqual([]);
  });

  it('checks household access before reading operational data', async () => {
    households.findAccess.mockResolvedValue(null);

    await expect(createUseCase().execute('user-id', 'batch-id')).rejects.toThrow('not accessible');
    expect(getAvailability).not.toHaveBeenCalled();
    expect(findByPreparedBatchId).not.toHaveBeenCalled();
  });

  function createUseCase() {
    return new GetPreparedBatchDetailsUseCase(
      households,
      batches,
      availability,
      portions,
      leftovers,
    );
  }
});

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
        nutrients: [],
      },
    ],
    now,
  );
  batch.finalize(1650, now);
  return batch;
}
