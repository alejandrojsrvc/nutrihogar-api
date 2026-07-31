import Decimal from 'decimal.js';
import {
  InvalidPreparedBatchIngredientError,
  InvalidPreparedBatchCookedWeightError,
  PreparedBatchAlreadyFinalizedError,
  PreparedBatchCancelledError,
  PreparedBatchIngredientsRequiredError,
  PreparedBatchNotConfirmableError,
  PreparedBatchNotDraftError,
} from '../errors/prepared-batch.errors';
import { PreparedBatch } from './prepared-batch';

describe('PreparedBatch', () => {
  it('starts with editable recipe ingredients in draft', () => {
    const batch = createBatch();

    expect(batch.status).toBe('DRAFT');
    expect(batch.ingredients).toHaveLength(2);
    expect(batch.ingredients[0].position).toBe(1);
    expect(batch.totalNutrients).toHaveLength(0);
  });

  it('rejects an empty batch and invalid quantities', () => {
    expect(() => PreparedBatch.start({ ...baseProps, ingredients: [] })).toThrow(
      PreparedBatchIngredientsRequiredError,
    );
    expect(() =>
      PreparedBatch.start({
        ...baseProps,
        ingredients: [{ ...baseProps.ingredients[0], quantity: new Decimal(0) }],
      }),
    ).toThrow(InvalidPreparedBatchIngredientError);
  });

  it('replaces ingredients only while in draft', () => {
    const batch = createBatch();
    batch.replaceIngredients([
      { ...baseProps.ingredients[0], quantity: new Decimal(700), position: 1 },
    ]);

    expect(batch.ingredients[0].quantity.equals(700)).toBe(true);

    batch.confirmIngredients([snapshot('ingredient-1')], at('2026-07-31T12:00:00Z'));
    expect(() => batch.replaceIngredients(batch.ingredients)).toThrow(PreparedBatchNotDraftError);
  });

  it('confirms nutrition snapshots and calculates total nutrients', () => {
    const batch = createBatch();
    batch.confirmIngredients(
      [snapshot('ingredient-1'), snapshot('ingredient-2', 2)],
      at('2026-07-31T12:00:00Z'),
    );

    expect(batch.status).toBe('INGREDIENTS_CONFIRMED');
    expect(batch.totalNutrients[0].amount.equals(300)).toBe(true);
    expect(batch.ingredients[0].baseQuantity?.equals(100)).toBe(true);
  });

  it('requires confirmation and positive cooked weight to finalize', () => {
    const batch = createBatch();
    expect(() => batch.finalize(1000, at('2026-07-31T12:00:00Z'))).toThrow(
      PreparedBatchNotConfirmableError,
    );

    batch.confirmIngredients(
      [snapshot('ingredient-1'), snapshot('ingredient-2', 2)],
      at('2026-07-31T12:00:00Z'),
    );
    expect(() => batch.finalize(0, at('2026-07-31T12:00:00Z'))).toThrow(
      InvalidPreparedBatchCookedWeightError,
    );

    batch.finalize(1000, at('2026-07-31T12:00:00Z'));
    expect(batch.status).toBe('FINALIZED');
    expect(batch.nutrientsPerGram?.ENERGY_KCAL?.equals(0.3)).toBe(true);
    expect(batch.nutrientsPer100Grams?.ENERGY_KCAL?.equals(30)).toBe(true);
    expect(() => batch.finalize(1000, at('2026-07-31T12:00:00Z'))).toThrow(
      PreparedBatchAlreadyFinalizedError,
    );
  });

  it('allows cancellation before finalization but preserves the terminal state', () => {
    const batch = createBatch();
    batch.cancel(at('2026-07-31T12:00:00Z'));

    expect(batch.status).toBe('CANCELLED');
    expect(() => batch.cancel(at('2026-07-31T12:01:00Z'))).toThrow(PreparedBatchCancelledError);
    expect(() => batch.finalize(1000, at('2026-07-31T12:01:00Z'))).toThrow(
      PreparedBatchCancelledError,
    );
  });
});

const baseProps = {
  id: 'batch-id',
  householdId: 'household-id',
  recipeId: 'recipe-id',
  recipeNameSnapshot: 'Arroz con pollo',
  preparedAt: at('2026-07-31T11:00:00Z'),
  createdById: 'user-id',
  createdAt: at('2026-07-31T11:00:00Z'),
  updatedAt: at('2026-07-31T11:00:00Z'),
  ingredients: [ingredient('ingredient-1', 500, 1), ingredient('ingredient-2', 300, 2)],
};

function createBatch() {
  return PreparedBatch.start(baseProps);
}

function ingredient(id: string, quantity: number, position: number) {
  return {
    id,
    foodId: `food-${id}`,
    quantity: new Decimal(quantity),
    unit: 'GRAM' as const,
    servingId: null,
    position,
    notes: null,
    foodNameSnapshot: null,
    brandSnapshot: null,
    preparationStateSnapshot: null,
    confidenceLevel: null,
    baseQuantity: null,
    baseUnit: null,
    nutrients: [],
  };
}

function snapshot(ingredientId: string, multiplier = 1) {
  return {
    ingredientId,
    foodId: `food-${ingredientId}`,
    foodName: 'Food',
    foodBrand: null,
    preparationState: 'RAW' as const,
    confidenceLevel: 'VERIFIED' as const,
    baseQuantity: new Decimal(100),
    baseUnit: 'GRAM' as const,
    nutrients: [
      {
        code: 'ENERGY_KCAL',
        name: 'Energy',
        unit: 'kcal',
        amount: new Decimal(100 * multiplier),
      },
    ],
  };
}

function at(value: string) {
  return new Date(value);
}
