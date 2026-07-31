import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { MealAlreadyCancelledError, CancelledMealEditError } from '../../domain/errors/meal.errors';
import { MealRepository, MealUnitOfWork } from '../ports/meal-repository.port';
import { CancelMealUseCase } from './cancel-meal.use-case';
import { UpdateMealUseCase } from './update-meal.use-case';

describe('UpdateMealUseCase', () => {
  let meals: jest.Mocked<MealRepository>;
  let unitOfWork: jest.Mocked<MealUnitOfWork>;
  let nutritionEngine: jest.Mocked<NutritionEngineService>;
  let replace: jest.Mock;
  let calculate: jest.Mock;
  const now = new Date('2026-07-30T12:00:00.000Z');

  beforeEach(() => {
    replace = jest.fn().mockResolvedValue(meal);
    calculate = jest.fn().mockResolvedValue(calculation);
    meals = {
      findHouseholdAccess: jest
        .fn()
        .mockResolvedValue({ role: 'MEMBER', timezone: 'America/Argentina/Buenos_Aires' }),
      hasActiveProfile: jest.fn(),
      findById: jest.fn().mockResolvedValue(meal),
      list: jest.fn(),
    };
    unitOfWork = {
      create: jest.fn(),
      replace,
      cancel: jest.fn(),
    };
    nutritionEngine = {
      calculate,
      calculateMany: jest.fn(),
    } as unknown as jest.Mocked<NutritionEngineService>;
  });

  it('recalculates and replaces snapshots when quantities change', async () => {
    const useCase = new UpdateMealUseCase(meals, unitOfWork, nutritionEngine, { now: () => now });

    await useCase.execute({
      actorId: 'user-id',
      mealId: 'meal-id',
      consumedAt: new Date('2026-07-30T11:30:00.000Z'),
      items: [
        {
          foodId: 'new-food-id',
          quantity: 220,
          unit: 'GRAM',
          measurementMethod: 'WEIGHED',
        },
      ],
    });

    expect(calculate).toHaveBeenCalledWith(
      expect.objectContaining({ foodId: 'new-food-id', quantity: 220 }),
    );
    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: 'meal-id',
        consumedAt: new Date('2026-07-30T11:30:00.000Z'),
        adultProfileId: 'profile-id',
      }),
    );
  });

  it('recalculates existing items when only the meal date changes', async () => {
    const useCase = new UpdateMealUseCase(meals, unitOfWork, nutritionEngine, { now: () => now });

    await useCase.execute({
      actorId: 'user-id',
      mealId: 'meal-id',
      consumedAt: new Date('2026-07-30T11:30:00.000Z'),
    });

    expect(calculate).toHaveBeenCalledWith(
      expect.objectContaining({ foodId: 'food-id', quantity: '180', servingId: undefined }),
    );
  });

  it('does not edit a cancelled meal', async () => {
    meals.findById.mockResolvedValue({ ...meal, status: 'CANCELLED' });
    const useCase = new UpdateMealUseCase(meals, unitOfWork, nutritionEngine, { now: () => now });

    await expect(useCase.execute({ actorId: 'user-id', mealId: 'meal-id' })).rejects.toBeInstanceOf(
      CancelledMealEditError,
    );
  });
});

describe('CancelMealUseCase', () => {
  it('marks a confirmed meal as cancelled with the current time', async () => {
    const meals = createMealsMock();
    const cancel = jest.fn().mockResolvedValue(true);
    const unitOfWork = {
      create: jest.fn(),
      replace: jest.fn(),
      cancel,
    } as unknown as jest.Mocked<MealUnitOfWork>;
    const now = new Date('2026-07-30T12:00:00.000Z');
    const useCase = new CancelMealUseCase(meals, unitOfWork, { now: () => now });

    await useCase.execute('user-id', 'meal-id');

    expect(cancel).toHaveBeenCalledWith({ mealId: 'meal-id', deletedAt: now });
  });

  it('rejects repeated cancellation', async () => {
    const meals = createMealsMock();
    meals.findById.mockResolvedValue({ ...meal, status: 'CANCELLED' });
    const unitOfWork = {
      create: jest.fn(),
      replace: jest.fn(),
      cancel: jest.fn(),
    } as unknown as jest.Mocked<MealUnitOfWork>;
    const useCase = new CancelMealUseCase(meals, unitOfWork, { now: () => new Date() });

    await expect(useCase.execute('user-id', 'meal-id')).rejects.toBeInstanceOf(
      MealAlreadyCancelledError,
    );
  });
});

function createMealsMock(): jest.Mocked<MealRepository> {
  return {
    findHouseholdAccess: jest
      .fn()
      .mockResolvedValue({ role: 'MEMBER', timezone: 'America/Argentina/Buenos_Aires' }),
    hasActiveProfile: jest.fn(),
    findById: jest.fn().mockResolvedValue(meal),
    list: jest.fn(),
  };
}

const calculation = {
  foodId: 'food-id',
  foodName: 'Arroz cocido',
  foodBrand: null,
  preparationState: 'COOKED' as const,
  confidenceLevel: 'VERIFIED' as const,
  baseQuantity: new Decimal(180),
  baseUnit: 'GRAM' as const,
  nutrients: { PROTEIN: new Decimal('4.86') },
  nutrientMetadata: { PROTEIN: { name: 'Proteína', unit: 'g' } },
};

const meal = {
  id: 'meal-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH' as const,
  consumedAt: new Date('2026-07-30T10:00:00.000Z'),
  status: 'CONFIRMED' as const,
  source: 'MANUAL' as const,
  notes: null,
  createdById: 'user-id',
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  deletedAt: null,
  items: [
    {
      id: 'item-id',
      foodId: 'food-id',
      foodServingId: null,
      nameSnapshot: 'Arroz cocido',
      brandSnapshot: null,
      preparationStateSnapshot: 'COOKED',
      quantity: new Decimal(180),
      unit: 'GRAM',
      baseQuantity: new Decimal(180),
      baseUnit: 'GRAM',
      measurementMethod: 'WEIGHED' as const,
      confidenceLevel: 'VERIFIED' as const,
      nutrients: [],
    },
  ],
};
