import Decimal from 'decimal.js';
import type { MealView } from '../../../meal-tracking/domain/models/meal.models';
import type { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';
import type { NutritionReportRepository } from '../ports/nutrition-report-repository.port';
import {
  GetDailyNutritionReportQuery,
  GetWeeklyNutritionReportQuery,
} from './get-nutrition-reports.query';

const profile = { id: 'profile', name: 'Alex', householdId: 'household', timezone: 'UTC' };
const goal = (id: string, validFrom: string, calories: number): NutritionGoalView => ({
  id,
  adultProfileId: profile.id,
  validFrom: new Date(validFrom),
  validUntil: null,
  values: {
    calories: new Decimal(calories),
    proteinGrams: new Decimal(100),
    carbohydrateGrams: new Decimal(200),
    fatGrams: new Decimal(60),
    fiberGrams: new Decimal(30),
  },
  goalType: 'MAINTENANCE',
  calculationMethod: 'test',
  calculationInput: {},
  confirmedById: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
});
const meal = (
  id: string,
  consumedAt: string,
  amount: number,
  status: MealView['status'] = 'CONFIRMED',
): MealView => ({
  id,
  householdId: profile.householdId,
  adultProfileId: profile.id,
  mealType: 'LUNCH',
  consumedAt: new Date(consumedAt),
  status,
  source: 'MANUAL',
  notes: null,
  createdById: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  items: [
    {
      id: `${id}-item`,
      foodId: null,
      foodServingId: null,
      nameSnapshot: 'Food',
      brandSnapshot: null,
      preparationStateSnapshot: 'RAW',
      quantity: new Decimal(1),
      unit: 'serving',
      baseQuantity: new Decimal(1),
      baseUnit: 'g',
      measurementMethod: 'WEIGHED',
      confidenceLevel: 'VERIFIED',
      nutrients:
        amount < 0
          ? []
          : [
              {
                id: `${id}-nutrient`,
                nutrientCode: 'ENERGY_KCAL',
                nutrientName: 'Calories',
                unit: 'kcal',
                amount: new Decimal(amount),
              },
            ],
    },
  ],
});

function repository(
  overrides: Partial<NutritionReportRepository> = {},
): jest.Mocked<NutritionReportRepository> {
  return {
    findAccessibleProfile: jest.fn().mockResolvedValue(profile),
    listMeals: jest.fn().mockResolvedValue([]),
    listGoals: jest.fn().mockResolvedValue([]),
    findPlan: jest.fn().mockResolvedValue(null),
    listBodyWeights: jest.fn().mockResolvedValue([]),
    countSymptoms: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe('nutrition reports', () => {
  it('selects the goal valid at the historical date and uses the requested timezone range', async () => {
    const repo = repository({
      listGoals: jest
        .fn()
        .mockResolvedValue([
          goal('new', '2026-01-10T00:00:00Z', 2000),
          goal('old', '2025-01-01T00:00:00Z', 1800),
        ]),
    });
    const report = await new GetDailyNutritionReportQuery(repo).execute({
      actorId: 'user',
      adultProfileId: profile.id,
      date: '2025-01-05',
      timezone: 'America/New_York',
    });
    expect(report.goal?.id).toBe('old');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.listMeals).toHaveBeenCalledWith(
      profile.id,
      new Date('2025-01-05T05:00:00.000Z'),
      new Date('2025-01-06T05:00:00.000Z'),
    );
  });

  it('excludes cancelled meals, preserves missing nutrients, and distinguishes no data from zero', async () => {
    const repo = repository({
      listMeals: jest
        .fn()
        .mockResolvedValue([
          meal('cancelled', '2026-08-01T10:00:00Z', 100, 'CANCELLED'),
          meal('zero', '2026-08-01T11:00:00Z', 0),
          meal('missing', '2026-08-01T12:00:00Z', -1),
        ]),
    });
    const report = await new GetDailyNutritionReportQuery(repo).execute({
      actorId: 'user',
      adultProfileId: profile.id,
      date: '2026-08-01',
    });
    expect(report.meals.map((item) => item.id)).toEqual(['zero', 'missing']);
    expect(report.hasConsumptionData).toBe(true);
    expect(report.totals.nutrients.find((item) => item.code === 'ENERGY_KCAL')?.amount).toBe(0);
    expect(report.warnings).toContain('some_meals_have_incomplete_nutrients');
    const empty = repository();
    expect(
      (
        await new GetDailyNutritionReportQuery(empty).execute({
          actorId: 'user',
          adultProfileId: profile.id,
          date: '2026-08-01',
        })
      ).hasConsumptionData,
    ).toBe(false);
  });

  it('does not compare the previous week when fewer than four days have data', async () => {
    const repo = repository({
      listMeals: jest.fn().mockResolvedValue([meal('current', '2026-08-01T12:00:00Z', 100)]),
    });
    const report = await new GetWeeklyNutritionReportQuery(repo).execute({
      actorId: 'user',
      adultProfileId: profile.id,
      weekStart: '2026-07-27',
    });
    expect(report.days).toHaveLength(7);
    expect(report.previousWeek).toEqual({ available: false, reason: 'insufficient_data' });
  });
});
