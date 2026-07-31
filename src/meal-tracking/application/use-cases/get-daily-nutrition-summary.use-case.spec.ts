import Decimal from 'decimal.js';
import { DailyNutritionSummaryRepository } from '../ports/daily-nutrition-summary-repository.port';
import { GetDailyNutritionSummaryUseCase } from './get-daily-nutrition-summary.use-case';

describe('GetDailyNutritionSummaryUseCase', () => {
  let summaries: jest.Mocked<DailyNutritionSummaryRepository>;
  let findByProfileAndRange: jest.Mock;

  beforeEach(() => {
    findByProfileAndRange = jest.fn().mockResolvedValue({ meals: [meal], goal });
    summaries = {
      findAccessibleProfile: jest.fn().mockResolvedValue({
        id: 'profile-id',
        name: 'Alejandro',
        householdId: 'household-id',
        timezone: 'America/Argentina/Buenos_Aires',
      }),
      findByProfileAndRange,
    };
  });

  it('sums snapshot nutrients and subtracts them from the goal', async () => {
    const useCase = new GetDailyNutritionSummaryUseCase(summaries);

    const result = await useCase.execute({
      actorId: 'user-id',
      adultProfileId: 'profile-id',
      date: '2026-07-29',
    });

    expect(result).toMatchObject({
      date: '2026-07-29',
      profile: { id: 'profile-id', name: 'Alejandro' },
      consumed: {
        dailyCalories: 500,
        proteinGrams: 40,
        carbohydrateGrams: 60,
        fatGrams: 15,
        fiberGrams: 4,
      },
      remaining: {
        dailyCalories: 1700,
        proteinGrams: 130,
        carbohydrateGrams: 170,
        fatGrams: 55,
        fiberGrams: 26,
      },
    });
    expect(findByProfileAndRange).toHaveBeenCalledWith(
      'profile-id',
      new Date('2026-07-29T03:00:00.000Z'),
      new Date('2026-07-30T03:00:00.000Z'),
    );
  });

  it('returns consumption without goal when no goal is active', async () => {
    findByProfileAndRange.mockResolvedValue({ meals: [], goal: null });
    const useCase = new GetDailyNutritionSummaryUseCase(summaries);

    const result = await useCase.execute({
      actorId: 'user-id',
      adultProfileId: 'profile-id',
      date: '2026-07-29',
    });

    expect(result.goal).toBeNull();
    expect(result.remaining).toBeNull();
    expect(result.consumed).toEqual({
      dailyCalories: 0,
      proteinGrams: 0,
      carbohydrateGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    });
  });
});

const goal = {
  id: 'goal-id',
  adultProfileId: 'profile-id',
  validFrom: new Date('2026-07-01T00:00:00.000Z'),
  validUntil: null,
  values: {
    calories: new Decimal(2200),
    proteinGrams: new Decimal(170),
    carbohydrateGrams: new Decimal(230),
    fatGrams: new Decimal(70),
    fiberGrams: new Decimal(30),
  },
  goalType: 'FAT_LOSS',
  calculationMethod: 'METHOD',
  calculationInput: {},
  confirmedById: 'user-id',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

const meal = {
  id: 'meal-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH' as const,
  consumedAt: new Date('2026-07-29T16:00:00.000Z'),
  status: 'CONFIRMED' as const,
  source: 'MANUAL' as const,
  notes: null,
  createdById: 'user-id',
  createdAt: new Date('2026-07-29T16:00:00.000Z'),
  updatedAt: new Date('2026-07-29T16:00:00.000Z'),
  deletedAt: null,
  items: [
    {
      id: 'item-id',
      foodId: 'food-id',
      foodServingId: null,
      nameSnapshot: 'Comida',
      brandSnapshot: null,
      preparationStateSnapshot: 'COOKED',
      quantity: new Decimal(100),
      unit: 'GRAM',
      baseQuantity: new Decimal(100),
      baseUnit: 'GRAM',
      measurementMethod: 'WEIGHED' as const,
      confidenceLevel: 'VERIFIED' as const,
      nutrients: [
        nutrient('ENERGY_KCAL', 500),
        nutrient('PROTEIN', 40),
        nutrient('CARBOHYDRATE', 60),
        nutrient('FAT', 15),
        nutrient('FIBER', 4),
      ],
    },
  ],
};

function nutrient(code: string, amount: number) {
  return {
    id: `${code}-snapshot`,
    nutrientCode: code,
    nutrientName: code,
    unit: code === 'ENERGY_KCAL' ? 'kcal' : 'g',
    amount: new Decimal(amount),
  };
}
