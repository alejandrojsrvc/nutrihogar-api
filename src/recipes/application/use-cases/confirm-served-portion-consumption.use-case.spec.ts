import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { ServedPortion } from '../../domain/entities/served-portion';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import {
  PreparedBatchMealInput,
  ServedPortionConsumptionUnitOfWork,
  ServedPortionRepository,
} from '../ports/served-portion-repository.port';
import { ConfirmServedPortionConsumptionUseCase } from './confirm-served-portion-consumption.use-case';

describe('ConfirmServedPortionConsumptionUseCase', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let batches: jest.Mocked<PreparedBatchRepository>;
  let portions: jest.Mocked<ServedPortionRepository>;
  let transaction: jest.Mocked<ServedPortionConsumptionUnitOfWork>;
  let confirmConsumption: jest.MockedFunction<
    ServedPortionConsumptionUnitOfWork['confirmConsumption']
  >;
  let clock: jest.Mocked<Clock>;
  let portion: ServedPortion;
  let batch: PreparedBatch;

  beforeEach(() => {
    batch = createFinalizedBatch();
    portion = ServedPortion.create({
      id: 'portion-id',
      preparedBatchId: 'batch-id',
      adultProfileId: 'adult-id',
      servedWeight: 520,
      servedAt: now,
      createdById: 'user-id',
      createdAt: now,
      updatedAt: now,
    });
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
    portions = {
      findById: jest.fn().mockResolvedValue(portion),
      findByPreparedBatchId: jest.fn(),
      save: jest.fn(),
      sumAllocatedWeight: jest.fn(),
    };
    confirmConsumption = jest
      .fn<
        ReturnType<ServedPortionConsumptionUnitOfWork['confirmConsumption']>,
        Parameters<ServedPortionConsumptionUnitOfWork['confirmConsumption']>
      >()
      .mockResolvedValue(undefined);
    transaction = { confirmConsumption };
    clock = { now: jest.fn().mockReturnValue(now) };
  });

  it('confirms partial consumption, creates a prepared-batch meal and preserves snapshots', async () => {
    const result = await createUseCase().execute({
      actorId: 'user-id',
      portionId: 'portion-id',
      remainderWeight: 40,
      remainderDisposition: 'SAVED',
      mealType: 'LUNCH',
      consumedAt: now,
    });

    expect(result.consumedWeight.equals(480)).toBe(true);
    expect(result.remainderWeight?.equals(40)).toBe(true);
    expect(result.mealId).toEqual(expect.any(String));
    expect(result.nutrients[0]?.amount.equals(new Decimal(650).div(1650).mul(480))).toBe(true);
    expect(confirmConsumption).toHaveBeenCalledTimes(1);
    const meal = confirmConsumption.mock.calls[0]?.[1] as PreparedBatchMealInput;
    expect(meal).toMatchObject({
      id: result.mealId,
      householdId: 'household-id',
      adultProfileId: 'adult-id',
      mealType: 'LUNCH',
    });
    expect(meal.item.quantity.equals(480)).toBe(true);
    expect(portion.status).toBe('CONSUMED');
  });

  it('confirms total consumption without a remainder', async () => {
    const result = await createUseCase().execute({
      actorId: 'user-id',
      portionId: 'portion-id',
      mealType: 'DINNER',
      consumedAt: now,
    });

    expect(result.consumedWeight.equals(520)).toBe(true);
    expect(result.remainderWeight).toBeNull();
    expect(result.mealId).not.toBeNull();
  });

  it('confirms a total remainder without creating a zero-calorie meal', async () => {
    const result = await createUseCase().execute({
      actorId: 'user-id',
      portionId: 'portion-id',
      remainderWeight: 520,
      remainderDisposition: 'DISCARDED',
      mealType: 'LUNCH',
      consumedAt: now,
    });

    expect(result.consumedWeight.equals(0)).toBe(true);
    expect(result.mealId).toBeNull();
    expect(confirmConsumption).toHaveBeenCalledWith(portion, null);
  });

  it('rejects a repeated confirmation through the domain state', async () => {
    const useCase = createUseCase();
    await useCase.execute({
      actorId: 'user-id',
      portionId: 'portion-id',
      mealType: 'LUNCH',
      consumedAt: now,
    });

    await expect(
      useCase.execute({
        actorId: 'user-id',
        portionId: 'portion-id',
        mealType: 'LUNCH',
        consumedAt: now,
      }),
    ).rejects.toThrow('already been confirmed');
    expect(confirmConsumption).toHaveBeenCalledTimes(1);
  });

  function createUseCase() {
    return new ConfirmServedPortionConsumptionUseCase(
      households,
      batches,
      portions,
      transaction,
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
