import Decimal from 'decimal.js';
import {
  IncompleteServingEquivalenceError,
  InvalidFoodQuantityError,
} from '../domain/errors/nutrition-engine.errors';
import { NutritionFoodData } from '../domain/models/nutrition-engine.models';
import { NutrientAggregator } from '../domain/services/nutrient-aggregator';
import { NutritionCalculator } from '../domain/services/nutrition-calculator';
import { UnitConverter } from '../domain/services/unit-converter';
import { NutritionCalculationPresenter } from '../presentation/nutrition-calculation.presenter';
import { NutritionFoodRepository } from './ports/nutrition-food-repository.port';
import { NutritionEngineService } from './nutrition-engine.service';

describe('NutritionEngineService', () => {
  let foods: jest.Mocked<NutritionFoodRepository>;
  let engine: NutritionEngineService;

  beforeEach(() => {
    foods = { findVisibleById: jest.fn() };
    engine = new NutritionEngineService(
      foods,
      new UnitConverter(),
      new NutritionCalculator(),
      new NutrientAggregator(),
    );
  });

  it('calculates 180 grams from a 100 gram reference without rounding internally', async () => {
    foods.findVisibleById.mockResolvedValue(rice);

    const result = await engine.calculate(command('rice', 180, 'GRAM'));

    expect(result.baseQuantity.equals(180)).toBe(true);
    expect(result.nutrients.ENERGY_KCAL?.equals(234)).toBe(true);
    expect(result.nutrients.PROTEIN?.equals('4.86')).toBe(true);
  });

  it('calculates a food whose base reference is milliliters', async () => {
    foods.findVisibleById.mockResolvedValue(milk);

    const result = await engine.calculate(command('milk', 250, 'MILLILITER'));

    expect(result.baseUnit).toBe('MILLILITER');
    expect(result.nutrients.ENERGY_KCAL?.equals(150)).toBe(true);
  });

  it('converts two eggs from their unit serving to grams', async () => {
    foods.findVisibleById.mockResolvedValue(egg);

    const result = await engine.calculate(command('egg', 2, 'SERVING', 'large-egg'));

    expect(result.baseQuantity.equals(100)).toBe(true);
    expect(result.baseUnit).toBe('GRAM');
    expect(result.nutrients.ENERGY_KCAL?.equals(143)).toBe(true);
  });

  it('converts a tablespoon of oil and omits unavailable nutrients', async () => {
    foods.findVisibleById.mockResolvedValue(oil);

    const result = await engine.calculate(command('oil', 1, 'SERVING', 'tablespoon'));

    expect(result.baseQuantity.equals('13.5')).toBe(true);
    expect(result.nutrients.FAT?.equals('13.5')).toBe(true);
    expect(result.nutrients.FIBER).toBeUndefined();
  });

  it('rejects non-positive quantities', async () => {
    foods.findVisibleById.mockResolvedValue(rice);

    await expect(engine.calculate(command('rice', -1, 'GRAM'))).rejects.toBeInstanceOf(
      InvalidFoodQuantityError,
    );
  });

  it('rejects a serving without an equivalence for the base unit', async () => {
    foods.findVisibleById.mockResolvedValue({
      ...oil,
      servings: [{ ...oil.servings[0], equivalentGrams: null }],
    });

    await expect(
      engine.calculate(command('oil', 1, 'SERVING', 'tablespoon')),
    ).rejects.toBeInstanceOf(IncompleteServingEquivalenceError);
  });

  it('sums nutrients from three foods without creating missing values', async () => {
    foods.findVisibleById.mockImplementation(({ foodId }) =>
      Promise.resolve({ rice, egg, oil }[foodId] ?? null),
    );

    const result = await engine.calculateMany([
      command('rice', 100, 'GRAM'),
      command('egg', 2, 'SERVING', 'large-egg'),
      command('oil', 1, 'SERVING', 'tablespoon'),
    ]);

    expect(result.nutrients.ENERGY_KCAL?.equals(273)).toBe(true);
    expect(result.nutrients.PROTEIN?.equals('15.3')).toBe(true);
    expect(result.nutrients.FAT?.equals('23.31')).toBe(true);
    expect(result.nutrients.FIBER).toBeUndefined();
  });

  it('rounds only when presenting the calculation', async () => {
    foods.findVisibleById.mockResolvedValue({
      ...rice,
      referenceQuantity: 3,
      nutrients: [{ code: 'ENERGY_KCAL', amount: 1 }],
    });

    const result = await engine.calculate(command('rice', 1, 'GRAM'));
    const presented = NutritionCalculationPresenter.present(result, 2);

    expect(result.nutrients.ENERGY_KCAL?.equals(new Decimal(1).div(3))).toBe(true);
    expect(presented.nutrients.ENERGY_KCAL).toBe(0.33);
  });

  it('keeps raw and cooked foods as distinct nutritional records', async () => {
    foods.findVisibleById.mockImplementation(({ foodId }) =>
      Promise.resolve(foodId === 'raw-rice' ? rawRice : cookedRice),
    );

    const raw = await engine.calculate(command('raw-rice', 100, 'GRAM'));
    const cooked = await engine.calculate(command('cooked-rice', 100, 'GRAM'));

    expect(raw.nutrients.ENERGY_KCAL?.equals(365)).toBe(true);
    expect(cooked.nutrients.ENERGY_KCAL?.equals(130)).toBe(true);
  });
});

function command(
  foodId: string,
  quantity: number,
  unit: 'GRAM' | 'MILLILITER' | 'UNIT' | 'SERVING',
  servingId?: string,
) {
  return {
    actorId: 'user-id',
    householdId: 'household-id',
    foodId,
    quantity,
    unit,
    servingId,
  };
}

const rice: NutritionFoodData = {
  id: 'rice',
  preparationState: 'COOKED',
  referenceQuantity: 100,
  referenceUnit: 'GRAM',
  nutrients: [
    { code: 'ENERGY_KCAL', amount: 130 },
    { code: 'PROTEIN', amount: 2.7 },
    { code: 'CARBOHYDRATE', amount: 28 },
    { code: 'FAT', amount: 0.3 },
  ],
  servings: [],
};

const milk: NutritionFoodData = {
  id: 'milk',
  preparationState: 'READY_TO_EAT',
  referenceQuantity: 100,
  referenceUnit: 'MILLILITER',
  nutrients: [{ code: 'ENERGY_KCAL', amount: 60 }],
  servings: [],
};

const egg: NutritionFoodData = {
  id: 'egg',
  preparationState: 'RAW',
  referenceQuantity: 100,
  referenceUnit: 'GRAM',
  nutrients: [
    { code: 'ENERGY_KCAL', amount: 143 },
    { code: 'PROTEIN', amount: 12.6 },
    { code: 'FAT', amount: 9.51 },
  ],
  servings: [
    {
      id: 'large-egg',
      quantity: 1,
      equivalentGrams: 50,
      equivalentMilliliters: null,
    },
  ],
};

const oil: NutritionFoodData = {
  id: 'oil',
  preparationState: 'READY_TO_EAT',
  referenceQuantity: 100,
  referenceUnit: 'GRAM',
  nutrients: [{ code: 'FAT', amount: 100 }],
  servings: [
    {
      id: 'tablespoon',
      quantity: 1,
      equivalentGrams: 13.5,
      equivalentMilliliters: null,
    },
  ],
};

const rawRice: NutritionFoodData = {
  ...rice,
  id: 'raw-rice',
  preparationState: 'RAW',
  nutrients: [{ code: 'ENERGY_KCAL', amount: 365 }],
};

const cookedRice: NutritionFoodData = {
  ...rice,
  id: 'cooked-rice',
  preparationState: 'COOKED',
  nutrients: [{ code: 'ENERGY_KCAL', amount: 130 }],
};
