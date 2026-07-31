import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { ConfirmPreparedBatchIngredientsUseCase } from './confirm-prepared-batch-ingredients.use-case';
import { FinalizePreparedBatchUseCase } from './finalize-prepared-batch.use-case';

describe('PreparedBatch confirmation use cases', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let batches: jest.Mocked<PreparedBatchRepository>;
  let calculateMany: jest.Mock;
  let clock: jest.Mocked<Clock>;
  let batch: PreparedBatch;
  let save: jest.Mock;

  beforeEach(() => {
    batch = createBatch();
    households = {
      findActiveForUser: jest.fn(),
      findAccess: jest.fn().mockResolvedValue({
        household: { id: 'household-id' },
        role: 'MEMBER',
        status: 'ACTIVE',
      }),
      updateName: jest.fn(),
    };
    save = jest.fn().mockResolvedValue(undefined);
    batches = {
      findById: jest.fn().mockResolvedValue(batch),
      save,
      listAvailableByHousehold: jest.fn(),
    };
    calculateMany = jest.fn().mockResolvedValue({
      items: [
        {
          foodId: 'food-id',
          foodName: 'Rice',
          foodBrand: null,
          preparationState: 'RAW',
          confidenceLevel: 'VERIFIED',
          baseQuantity: new Decimal(500),
          baseUnit: 'GRAM',
          nutrients: { ENERGY_KCAL: new Decimal(650) },
          nutrientMetadata: { ENERGY_KCAL: { name: 'Energy', unit: 'kcal' } },
        },
      ],
      nutrients: { ENERGY_KCAL: new Decimal(650) },
    });
    clock = { now: jest.fn().mockReturnValue(now) };
  });

  it('calculates nutrition, stores snapshots and returns warnings for missing data', async () => {
    const useCase = new ConfirmPreparedBatchIngredientsUseCase(
      households,
      batches,
      { calculateMany } as unknown as NutritionEngineService,
      clock,
    );

    const result = await useCase.execute('user-id', 'batch-id');

    expect(result.batch.status).toBe('INGREDIENTS_CONFIRMED');
    expect(result.batch.totalNutrients[0]?.amount.equals(650)).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(calculateMany).toHaveBeenCalledWith([
      {
        actorId: 'user-id',
        householdId: 'household-id',
        foodId: 'food-id',
        quantity: new Decimal(500),
        unit: 'GRAM',
        servingId: undefined,
      },
    ]);
    expect(save).toHaveBeenCalledWith(batch);
  });

  it('does not block confirmation when an ingredient has no nutrients', async () => {
    calculateMany.mockResolvedValue({
      items: [
        {
          foodId: 'food-id',
          foodName: 'Rice',
          foodBrand: null,
          preparationState: 'RAW',
          confidenceLevel: 'LOW',
          baseQuantity: new Decimal(500),
          baseUnit: 'GRAM',
          nutrients: {},
          nutrientMetadata: {},
        },
      ],
      nutrients: {},
    });
    const useCase = new ConfirmPreparedBatchIngredientsUseCase(
      households,
      batches,
      { calculateMany } as unknown as NutritionEngineService,
      clock,
    );

    const result = await useCase.execute('user-id', 'batch-id');

    expect(result.batch.status).toBe('INGREDIENTS_CONFIRMED');
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'NUTRIENTS_UNAVAILABLE', foodId: 'food-id' }),
    ]);
  });

  it('finalizes a confirmed batch and calculates density without rounding internally', async () => {
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
    const useCase = new FinalizePreparedBatchUseCase(households, batches, clock);

    const result = await useCase.execute({
      actorId: 'user-id',
      batchId: 'batch-id',
      finalCookedWeight: 1650,
    });

    expect(result.status).toBe('FINALIZED');
    expect(result.nutrientsPerGram?.ENERGY_KCAL?.equals(new Decimal(650).div(1650))).toBe(true);
    expect(result.nutrientsPer100Grams?.ENERGY_KCAL?.equals(new Decimal(65000).div(1650))).toBe(
      true,
    );
  });
});

const now = new Date('2026-07-31T12:00:00.000Z');

function createBatch() {
  return PreparedBatch.start({
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
}
