import Decimal from 'decimal.js';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { EmptyMealError, InvalidMealDateError } from '../../domain/errors/meal.errors';
import { MealRepository, MealUnitOfWork } from '../ports/meal-repository.port';
import { RegisterMealUseCase } from './register-meal.use-case';

describe('RegisterMealUseCase', () => {
  let meals: jest.Mocked<MealRepository>;
  let unitOfWork: jest.Mocked<MealUnitOfWork>;
  let nutritionEngine: jest.Mocked<NutritionEngineService>;
  let calculate: jest.Mock;
  let create: jest.Mock;
  let useCase: RegisterMealUseCase;

  beforeEach(() => {
    meals = {
      findHouseholdAccess: jest
        .fn()
        .mockResolvedValue({ role: 'MEMBER', timezone: 'America/Argentina/Buenos_Aires' }),
      hasActiveProfile: jest.fn().mockResolvedValue(true),
      findById: jest.fn(),
      list: jest.fn(),
    };
    create = jest.fn().mockResolvedValue(meal);
    unitOfWork = { create };
    calculate = jest.fn().mockResolvedValue(calculation);
    nutritionEngine = {
      calculate,
      calculateMany: jest.fn(),
    } as unknown as jest.Mocked<NutritionEngineService>;
    const clock: Clock = { now: () => now };
    useCase = new RegisterMealUseCase(meals, unitOfWork, nutritionEngine, clock);
  });

  it('calculates each food and persists its nutrition snapshots', async () => {
    await useCase.execute(command);

    expect(calculate).toHaveBeenCalledWith({
      actorId: 'user-id',
      householdId: 'household-id',
      foodId: 'food-id',
      quantity: 220,
      unit: 'GRAM',
      servingId: undefined,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'MANUAL',
        createdById: 'user-id',
        items: [
          expect.objectContaining({
            nameSnapshot: 'Pollo cocido',
            baseQuantity: new Decimal(220),
            nutrients: [
              {
                code: 'PROTEIN',
                name: 'Proteína',
                unit: 'g',
                amount: new Decimal('68.2'),
              },
            ],
          }),
        ],
      }),
    );
  });

  it('rejects an empty meal before invoking the nutrition engine', async () => {
    await expect(useCase.execute({ ...command, items: [] })).rejects.toBeInstanceOf(EmptyMealError);
    expect(calculate).not.toHaveBeenCalled();
  });

  it('rejects a meal too far in the future', async () => {
    await expect(
      useCase.execute({ ...command, consumedAt: new Date('2026-07-30T12:06:00.000Z') }),
    ).rejects.toBeInstanceOf(InvalidMealDateError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an adult profile from another household', async () => {
    meals.hasActiveProfile.mockResolvedValue(false);

    await expect(useCase.execute(command)).rejects.toThrow(
      'The adult profile does not belong to the household.',
    );
    expect(calculate).not.toHaveBeenCalled();
  });
});

const now = new Date('2026-07-30T12:00:00.000Z');
const command = {
  actorId: 'user-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH' as const,
  consumedAt: now,
  notes: null,
  items: [
    {
      foodId: 'food-id',
      quantity: 220,
      unit: 'GRAM' as const,
      measurementMethod: 'WEIGHED' as const,
    },
  ],
};

const calculation = {
  foodId: 'food-id',
  foodName: 'Pollo cocido',
  foodBrand: null,
  preparationState: 'COOKED' as const,
  confidenceLevel: 'VERIFIED' as const,
  baseQuantity: new Decimal(220),
  baseUnit: 'GRAM' as const,
  nutrients: { PROTEIN: new Decimal('68.2') },
  nutrientMetadata: { PROTEIN: { name: 'Proteína', unit: 'g' } },
};

const meal = {
  id: 'meal-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH' as const,
  consumedAt: now,
  status: 'CONFIRMED' as const,
  source: 'MANUAL' as const,
  notes: null,
  createdById: 'user-id',
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  items: [],
};
