import Decimal from 'decimal.js';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { PortionAvailabilityExceededError } from '../../domain/errors/served-portion.errors';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import {
  PreparedBatchAvailabilityRepository,
  ServedPortionUnitOfWork,
} from '../ports/served-portion-repository.port';
import { ServePreparedBatchPortionsUseCase } from './serve-prepared-batch-portions.use-case';

describe('ServePreparedBatchPortionsUseCase', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let batches: jest.Mocked<PreparedBatchRepository>;
  let availability: jest.Mocked<PreparedBatchAvailabilityRepository>;
  let portions: jest.Mocked<ServedPortionUnitOfWork>;
  let adultProfiles: jest.Mocked<AdultProfileRepository>;
  let clock: jest.Mocked<Clock>;
  let saveMany: jest.Mock;
  let batch: PreparedBatch;

  beforeEach(() => {
    batch = createFinalizedBatch();
    saveMany = jest.fn().mockResolvedValue(undefined);
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
    availability = {
      getAvailability: jest.fn().mockResolvedValue({
        finalCookedWeight: new Decimal(1650),
        servedWeight: new Decimal(0),
        savedRemainderWeight: new Decimal(0),
        discardedWeight: new Decimal(0),
        availableWeight: new Decimal(1650),
      }),
    };
    portions = { saveMany };
    adultProfiles = {
      findActiveByUserAndHousehold: jest.fn(),
      findActiveById: jest.fn(),
      listActiveByHousehold: jest
        .fn()
        .mockResolvedValue([profile('profile-a'), profile('profile-b')]),
    };
    clock = { now: jest.fn().mockReturnValue(now) };
  });

  it('serves multiple adults and returns potential nutrients from batch density', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      actorId: 'user-id',
      batchId: 'batch-id',
      servedAt: now,
      portions: [
        { adultProfileId: 'profile-a', servedWeight: 520 },
        { adultProfileId: 'profile-b', servedWeight: 380 },
      ],
    });

    expect(result.preparedBatchId).toBe('batch-id');
    expect(result.portions).toHaveLength(2);
    expect(result.portions[0]?.servedWeight.equals(520)).toBe(true);
    expect(
      result.portions[0]?.estimatedNutrition.ENERGY_KCAL?.equals(
        new Decimal(650).div(1650).mul(520),
      ),
    ).toBe(true);
    expect(result.availableWeight.equals(750)).toBe(true);
    expect(saveMany).toHaveBeenCalledWith('batch-id', expect.any(Array));
  });

  it('allows several portions for the same adult', async () => {
    const result = await createUseCase().execute({
      actorId: 'user-id',
      batchId: 'batch-id',
      portions: [
        { adultProfileId: 'profile-a', servedWeight: 200 },
        { adultProfileId: 'profile-a', servedWeight: 300 },
      ],
    });

    expect(result.portions).toHaveLength(2);
    expect(result.availableWeight.equals(1150)).toBe(true);
  });

  it('rejects portions exceeding availability before persistence', async () => {
    await expect(
      createUseCase().execute({
        actorId: 'user-id',
        batchId: 'batch-id',
        portions: [{ adultProfileId: 'profile-a', servedWeight: 1651 }],
      }),
    ).rejects.toBeInstanceOf(PortionAvailabilityExceededError);
    expect(saveMany).not.toHaveBeenCalled();
  });

  it('rejects a profile from another household', async () => {
    await expect(
      createUseCase().execute({
        actorId: 'user-id',
        batchId: 'batch-id',
        portions: [{ adultProfileId: 'other-profile', servedWeight: 100 }],
      }),
    ).rejects.toThrow('Adult profile not found.');
    expect(saveMany).not.toHaveBeenCalled();
  });

  function createUseCase() {
    return new ServePreparedBatchPortionsUseCase(
      households,
      batches,
      availability,
      portions,
      adultProfiles,
      clock,
    );
  }
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

function profile(id: string) {
  return {
    id,
    householdId: 'household-id',
    userId: `${id}-user`,
    name: id,
    birthDate: new Date('1990-01-01T00:00:00.000Z'),
    age: 36,
    biologicalSex: 'MALE' as const,
    weightKg: 80,
    heightCm: 180,
    activityLevel: 'MODERATE' as const,
    primaryGoal: 'MAINTENANCE' as const,
    hasKitchenScale: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dietaryRestrictions: [],
  };
}
