import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { MealAlreadyCancelledError } from '../../domain/errors/meal.errors';
import { MealRepository, MealUnitOfWork } from '../ports/meal-repository.port';
import { DuplicateMealUseCase } from './duplicate-meal.use-case';

describe('DuplicateMealUseCase', () => {
  let meals: jest.Mocked<MealRepository>;
  let unitOfWork: jest.Mocked<MealUnitOfWork>;
  let nutritionEngine: jest.Mocked<NutritionEngineService>;
  let create: jest.Mock;
  let calculate: jest.Mock;
  const now = new Date('2026-07-30T16:00:00.000Z');

  beforeEach(() => {
    create = jest.fn().mockResolvedValue(duplicatedMeal);
    calculate = jest.fn().mockResolvedValue(calculation);
    meals = {
      findHouseholdAccess: jest
        .fn()
        .mockResolvedValue({ role: 'MEMBER', timezone: 'America/Argentina/Buenos_Aires' }),
      hasActiveProfile: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue(originalMeal),
      list: jest.fn(),
    };
    unitOfWork = {
      create,
      replace: jest.fn(),
      cancel: jest.fn(),
    };
    nutritionEngine = {
      calculate,
      calculateMany: jest.fn(),
    } as unknown as jest.Mocked<NutritionEngineService>;
  });

  it('creates a new meal with recalculated snapshots and duplicated source', async () => {
    const useCase = new DuplicateMealUseCase(meals, unitOfWork, nutritionEngine, {
      now: () => now,
    });

    await useCase.execute({
      actorId: 'user-id',
      mealId: 'meal-id',
      adultProfileId: 'new-profile-id',
      mealType: 'DINNER',
      consumedAt: new Date('2026-07-30T15:00:00.000Z'),
    });

    expect(calculate).toHaveBeenCalledWith(
      expect.objectContaining({ foodId: 'food-id', quantity: '180', unit: 'GRAM' }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        adultProfileId: 'new-profile-id',
        mealType: 'DINNER',
        source: 'DUPLICATED',
      }),
    );
  });

  it('does not duplicate a cancelled meal', async () => {
    meals.findById.mockResolvedValue({ ...originalMeal, status: 'CANCELLED' });
    const useCase = new DuplicateMealUseCase(meals, unitOfWork, nutritionEngine, {
      now: () => now,
    });

    await expect(
      useCase.execute({
        actorId: 'user-id',
        mealId: 'meal-id',
        adultProfileId: 'new-profile-id',
        mealType: 'DINNER',
        consumedAt: new Date('2026-07-30T15:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(MealAlreadyCancelledError);
    expect(create).not.toHaveBeenCalled();
  });
});

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

const originalMeal = {
  id: 'meal-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH' as const,
  consumedAt: new Date('2026-07-30T10:00:00.000Z'),
  status: 'CONFIRMED' as const,
  source: 'MANUAL' as const,
  notes: 'Original',
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

const duplicatedMeal = { ...originalMeal, id: 'duplicated-meal-id', source: 'DUPLICATED' as const };
