import Decimal from 'decimal.js';
import { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';
import { MealView } from '../../domain/models/meal.models';
import { MealProfileNotFoundError } from '../errors/meal-application.errors';
import { DailyNutritionSummaryRepository } from '../ports/daily-nutrition-summary-repository.port';
import { toUtcMealDateRange } from '../services/meal-date-range';

export const GET_DAILY_NUTRITION_SUMMARY_USE_CASE = Symbol('GetDailyNutritionSummaryUseCase');

export interface GetDailyNutritionSummaryCommand {
  actorId: string;
  adultProfileId: string;
  date: string;
}

export interface DailyNutritionSummary {
  date: string;
  profile: { id: string; name: string };
  goal: NutritionSummaryValues | null;
  consumed: NutritionSummaryValues;
  remaining: NutritionSummaryValues | null;
  meals: DailyNutritionMealSummary[];
}

export interface NutritionSummaryValues {
  dailyCalories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface DailyNutritionMealSummary {
  id: string;
  mealType: MealView['mealType'];
  consumedAt: Date;
  totals: Record<string, number>;
}

const nutrientKeys = {
  dailyCalories: 'ENERGY_KCAL',
  proteinGrams: 'PROTEIN',
  carbohydrateGrams: 'CARBOHYDRATE',
  fatGrams: 'FAT',
  fiberGrams: 'FIBER',
} as const;

export class GetDailyNutritionSummaryUseCase {
  constructor(private readonly summaries: DailyNutritionSummaryRepository) {}

  async execute(command: GetDailyNutritionSummaryCommand): Promise<DailyNutritionSummary> {
    const profile = await this.summaries.findAccessibleProfile(
      command.actorId,
      command.adultProfileId,
    );
    if (!profile) throw new MealProfileNotFoundError();

    const range = toUtcMealDateRange(
      { dateFrom: command.date, dateTo: command.date },
      profile.timezone,
    );
    const dateFrom = range.dateFrom;
    const dateTo = range.dateTo;
    if (!dateFrom || !dateTo) throw new MealProfileNotFoundError();

    const data = await this.summaries.findByProfileAndRange(profile.id, dateFrom, dateTo);
    const consumed = sumMeals(data.meals);
    const goal = data.goal ? toSummaryValues(data.goal) : null;

    return {
      date: command.date,
      profile: { id: profile.id, name: profile.name },
      goal,
      consumed,
      remaining: goal ? subtract(goal, consumed) : null,
      meals: data.meals.map(toMealSummary),
    };
  }
}

function sumMeals(meals: MealView[]): NutritionSummaryValues {
  const totals = meals.reduce<Record<string, Decimal>>((accumulator, meal) => {
    for (const item of meal.items) {
      for (const nutrient of item.nutrients) {
        accumulator[nutrient.nutrientCode] = (
          accumulator[nutrient.nutrientCode] ?? new Decimal(0)
        ).add(nutrient.amount);
      }
    }
    return accumulator;
  }, {});

  return fromNutrientAmounts(totals);
}

function toSummaryValues(goal: NutritionGoalView): NutritionSummaryValues {
  return {
    dailyCalories: goal.values.calories.toNumber(),
    proteinGrams: goal.values.proteinGrams.toNumber(),
    carbohydrateGrams: goal.values.carbohydrateGrams.toNumber(),
    fatGrams: goal.values.fatGrams.toNumber(),
    fiberGrams: goal.values.fiberGrams.toNumber(),
  };
}

function fromNutrientAmounts(amounts: Record<string, Decimal>): NutritionSummaryValues {
  return Object.fromEntries(
    Object.entries(nutrientKeys).map(([property, code]) => [
      property,
      amounts[code]?.toNumber() ?? 0,
    ]),
  ) as NutritionSummaryValues;
}

function subtract(goal: NutritionSummaryValues, consumed: NutritionSummaryValues) {
  return {
    dailyCalories: goal.dailyCalories - consumed.dailyCalories,
    proteinGrams: goal.proteinGrams - consumed.proteinGrams,
    carbohydrateGrams: goal.carbohydrateGrams - consumed.carbohydrateGrams,
    fatGrams: goal.fatGrams - consumed.fatGrams,
    fiberGrams: goal.fiberGrams - consumed.fiberGrams,
  };
}

function toMealSummary(meal: MealView): DailyNutritionMealSummary {
  const totals: Record<string, number> = {};
  for (const item of meal.items) {
    for (const nutrient of item.nutrients) {
      totals[nutrient.nutrientCode] =
        (totals[nutrient.nutrientCode] ?? 0) + nutrient.amount.toNumber();
    }
  }

  return { id: meal.id, mealType: meal.mealType, consumedAt: meal.consumedAt, totals };
}
