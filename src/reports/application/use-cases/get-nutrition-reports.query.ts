import Decimal from 'decimal.js';
import { MealProfileNotFoundError } from '../../../meal-tracking/application/errors/meal-application.errors';
import { toUtcMealDateRange } from '../../../meal-tracking/application/services/meal-date-range';
import type { MealView } from '../../../meal-tracking/domain/models/meal.models';
import type { NutritionGoalView } from '../../../nutrition/domain/models/nutrition-goal.models';
import type { NutritionReportRepository } from '../ports/nutrition-report-repository.port';
import type { WeeklyPlan } from '../../../meal-planning/domain/entities/weekly-plan';
import { PlannedMealStatus } from '../../../meal-planning/domain/value-objects/planned-meal';

export const GET_DAILY_NUTRITION_REPORT_QUERY = Symbol('GetDailyNutritionReportQuery');
export const GET_WEEKLY_NUTRITION_REPORT_QUERY = Symbol('GetWeeklyNutritionReportQuery');

export interface NutritionReportCommand {
  actorId: string;
  adultProfileId: string;
  timezone?: string;
}
export interface DailyNutritionReportCommand extends NutritionReportCommand {
  date: string;
}
export interface WeeklyNutritionReportCommand extends NutritionReportCommand {
  weekStart: string;
  targetRange?: { min: number; max: number };
}

export interface NutrientAmount {
  code: string;
  name: string;
  unit: string;
  amount: number;
}
export interface NutritionReportValues {
  nutrients: NutrientAmount[];
}
export interface ReportGoal {
  id: string;
  validFrom: Date;
  validUntil: Date | null;
  nutrients: NutrientAmount[];
}
export interface ReportMeal {
  id: string;
  mealType: MealView['mealType'];
  consumedAt: Date;
  source: MealView['source'];
  measurementMethods: MealView['items'][number]['measurementMethod'][];
  confidenceLevels: MealView['items'][number]['confidenceLevel'][];
  nutrients: NutrientAmount[];
  plannedMealId: string | null;
}
export interface DailyNutritionReport {
  date: string;
  timezone: string;
  profile: { id: string; name: string };
  hasConsumptionData: boolean;
  totals: NutritionReportValues;
  goal: ReportGoal | null;
  comparison: Record<string, number> | null;
  meals: ReportMeal[];
  warnings: string[];
  planning: { planned: number; consumed: number; adherence: number | null } | null;
}
export interface WeeklyNutritionReport {
  weekStart: string;
  weekEnd: string;
  timezone: string;
  profile: { id: string; name: string };
  days: Array<{
    date: string;
    hasConsumptionData: boolean;
    totals: NutritionReportValues;
    goal: ReportGoal | null;
    meals: ReportMeal[];
  }>;
  totals: NutritionReportValues;
  averages: NutritionReportValues;
  recordedMealCount: number;
  daysInTargetRange: number | null;
  dataQuality: { daysWithData: number; daysWithoutData: number; incompleteNutrients: string[] };
  previousWeek: { available: boolean; reason?: string; totals?: NutritionReportValues };
  planning: { planned: number; consumed: number; adherence: number | null } | null;
  bodyWeight: {
    first: { value: number; unit: string; recordedAt: Date } | null;
    last: { value: number; unit: string; recordedAt: Date } | null;
  };
  symptomCount: number;
}

export class GetDailyNutritionReportQuery {
  constructor(private readonly repository: NutritionReportRepository) {}

  async execute(command: DailyNutritionReportCommand): Promise<DailyNutritionReport> {
    const context = await this.context(command);
    const range = dateRange(command.date, context.timezone);
    const meals = await this.repository.listMeals(context.profile.id, range.from, range.to);
    const plan = await this.repository.findPlan(
      context.profile.householdId,
      new Date(`${weekStartOf(command.date)}T00:00:00.000Z`),
    );
    return toDaily(context, command.date, meals, findGoal(context.goals, range.from), plan);
  }

  private async context(command: NutritionReportCommand) {
    const profile = await this.repository.findAccessibleProfile(
      command.actorId,
      command.adultProfileId,
    );
    if (!profile) throw new MealProfileNotFoundError();
    const timezone = command.timezone ?? profile.timezone;
    assertTimezone(timezone);
    return { profile, timezone, goals: await this.repository.listGoals(profile.id) };
  }
}

export class GetWeeklyNutritionReportQuery {
  constructor(private readonly repository: NutritionReportRepository) {}

  async execute(command: WeeklyNutritionReportCommand): Promise<WeeklyNutritionReport> {
    const profile = await this.repository.findAccessibleProfile(
      command.actorId,
      command.adultProfileId,
    );
    if (!profile) throw new MealProfileNotFoundError();
    const timezone = command.timezone ?? profile.timezone;
    assertTimezone(timezone);
    const weekStart = dateRange(command.weekStart, timezone);
    const weekEndDate = addDays(command.weekStart, 6);
    const weekEnd = dateRange(weekEndDate, timezone);
    const goals = await this.repository.listGoals(profile.id);
    const meals = await this.repository.listMeals(profile.id, weekStart.from, weekEnd.to);
    const plan = await this.repository.findPlan(
      profile.householdId,
      new Date(`${command.weekStart}T00:00:00.000Z`),
    );
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(command.weekStart, index);
      const range = dateRange(date, timezone);
      return toDaily(
        { profile, timezone },
        date,
        meals.filter((meal) => meal.consumedAt >= range.from && meal.consumedAt < range.to),
        findGoal(goals, range.from),
        plan,
      );
    });
    const daysWithData = days.filter((day) => day.hasConsumptionData);
    const previousStart = dateRange(addDays(command.weekStart, -7), timezone);
    const previousMeals = await this.repository.listMeals(
      profile.id,
      previousStart.from,
      weekStart.from,
    );
    const previousDays = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(command.weekStart, index - 7);
      const range = dateRange(date, timezone);
      return toDaily(
        { profile, timezone },
        date,
        previousMeals.filter((meal) => meal.consumedAt >= range.from && meal.consumedAt < range.to),
        findGoal(goals, range.from),
        null,
      );
    });
    const previousWithData = previousDays.filter((day) => day.hasConsumptionData);
    const [weights, symptomCount] = await Promise.all([
      this.repository.listBodyWeights(profile.id, weekStart.from, weekEnd.to),
      this.repository.countSymptoms(profile.id, weekStart.from, weekEnd.to),
    ]);
    return {
      weekStart: command.weekStart,
      weekEnd: weekEndDate,
      timezone,
      profile: { id: profile.id, name: profile.name },
      days,
      totals: sumValues(days.map((day) => day.totals)),
      averages: divideValues(sumValues(days.map((day) => day.totals)), daysWithData.length || 1),
      recordedMealCount: meals.filter((meal) => meal.status !== 'CANCELLED').length,
      daysInTargetRange: days.filter((day) =>
        inTargetRange(day, command.targetRange ?? { min: 0.8, max: 1.2 }),
      ).length,
      dataQuality: {
        daysWithData: daysWithData.length,
        daysWithoutData: 7 - daysWithData.length,
        incompleteNutrients: missingNutrients(meals),
      },
      previousWeek:
        previousWithData.length >= 4
          ? { available: true, totals: sumValues(previousDays.map((day) => day.totals)) }
          : { available: false, reason: 'insufficient_data' },
      planning: plan
        ? planStats(
            plan,
            days.flatMap((day) => day.meals),
            profile.id,
          )
        : null,
      bodyWeight: { first: weights[0] ?? null, last: weights[weights.length - 1] ?? null },
      symptomCount,
    };
  }
}

function toDaily(
  context: { profile: { id: string; name: string }; timezone: string },
  date: string,
  meals: MealView[],
  goal: NutritionGoalView | null,
  plan: WeeklyPlan | null = null,
): DailyNutritionReport {
  const reportMeals = meals.filter((meal) => meal.status !== 'CANCELLED').map(toMeal);
  const totals = sumValues(reportMeals.map((meal) => ({ nutrients: meal.nutrients })));
  const goalReport = goal ? toGoal(goal) : null;
  const comparison = goalReport
    ? Object.fromEntries(
        goalReport.nutrients.map((nutrient) => [
          nutrient.code,
          (totals.nutrients.find((item) => item.code === nutrient.code)?.amount ?? 0) -
            nutrient.amount,
        ]),
      )
    : null;
  return {
    date,
    timezone: context.timezone,
    profile: { id: context.profile.id, name: context.profile.name },
    hasConsumptionData: reportMeals.length > 0,
    totals,
    goal: goalReport,
    comparison,
    meals: reportMeals,
    warnings: reportMeals.some((meal) => meal.nutrients.length === 0)
      ? ['some_meals_have_incomplete_nutrients']
      : [],
    planning: plan ? planStats(plan, reportMeals, context.profile.id, date) : null,
  };
}

function toMeal(meal: MealView): ReportMeal {
  return {
    id: meal.id,
    mealType: meal.mealType,
    consumedAt: meal.consumedAt,
    source: meal.source,
    measurementMethods: [...new Set(meal.items.map((item) => item.measurementMethod))],
    confidenceLevels: [...new Set(meal.items.map((item) => item.confidenceLevel))],
    nutrients: nutrients(meal),
    plannedMealId: meal.plannedMealId ?? null,
  };
}

function nutrients(meal: MealView): NutrientAmount[] {
  const map = new Map<string, NutrientAmount>();
  for (const item of meal.items)
    for (const nutrient of item.nutrients) {
      const current = map.get(nutrient.nutrientCode);
      map.set(nutrient.nutrientCode, {
        code: nutrient.nutrientCode,
        name: nutrient.nutrientName,
        unit: nutrient.unit,
        amount: (current?.amount ?? 0) + nutrient.amount.toNumber(),
      });
    }
  return [...map.values()];
}

function toGoal(goal: NutritionGoalView): ReportGoal {
  return {
    id: goal.id,
    validFrom: goal.validFrom,
    validUntil: goal.validUntil,
    nutrients: [
      {
        code: 'ENERGY_KCAL',
        name: 'Calories',
        unit: 'kcal',
        amount: goal.values.calories.toNumber(),
      },
      { code: 'PROTEIN', name: 'Protein', unit: 'g', amount: goal.values.proteinGrams.toNumber() },
      {
        code: 'CARBOHYDRATE',
        name: 'Carbohydrates',
        unit: 'g',
        amount: goal.values.carbohydrateGrams.toNumber(),
      },
      { code: 'FAT', name: 'Fat', unit: 'g', amount: goal.values.fatGrams.toNumber() },
      { code: 'FIBER', name: 'Fiber', unit: 'g', amount: goal.values.fiberGrams.toNumber() },
    ],
  };
}

function sumValues(values: NutritionReportValues[]): NutritionReportValues {
  const map = new Map<string, NutrientAmount>();
  for (const value of values)
    for (const nutrient of value.nutrients) {
      const current = map.get(nutrient.code);
      map.set(nutrient.code, {
        ...nutrient,
        amount: new Decimal(current?.amount ?? 0).add(nutrient.amount).toNumber(),
      });
    }
  return { nutrients: [...map.values()] };
}
function divideValues(value: NutritionReportValues, divisor: number): NutritionReportValues {
  return {
    nutrients: value.nutrients.map((nutrient) => ({
      ...nutrient,
      amount: new Decimal(nutrient.amount).div(divisor).toNumber(),
    })),
  };
}
function findGoal(goals: NutritionGoalView[], at: Date): NutritionGoalView | null {
  return (
    goals
      .filter((goal) => goal.validFrom <= at && (goal.validUntil === null || goal.validUntil > at))
      .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0] ?? null
  );
}
function dateRange(date: string, timezone: string) {
  const range = toUtcMealDateRange({ dateFrom: date, dateTo: date }, timezone);
  if (!range.dateFrom || !range.dateTo) throw new Error('Invalid date');
  return { from: range.dateFrom, to: range.dateTo };
}
function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function assertTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new Error('Invalid timezone');
  }
}
function missingNutrients(meals: MealView[]) {
  return [
    ...new Set(
      meals.flatMap((meal) =>
        meal.items.flatMap((item) => (item.nutrients.length ? [] : ['meal_item_nutrients'])),
      ),
    ),
  ];
}
function inTargetRange(day: DailyNutritionReport, range: { min: number; max: number }) {
  const goal = day.goal?.nutrients.find((nutrient) => nutrient.code === 'ENERGY_KCAL');
  const consumed = day.totals.nutrients.find((nutrient) => nutrient.code === 'ENERGY_KCAL');
  return Boolean(
    day.hasConsumptionData &&
    goal &&
    consumed &&
    consumed.amount >= goal.amount * range.min &&
    consumed.amount <= goal.amount * range.max,
  );
}
function weekStartOf(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value.toISOString().slice(0, 10);
}
function planStats(plan: WeeklyPlan, meals: ReportMeal[], profileId: string, date?: string) {
  const planned = plan.meals.filter(
    (item) =>
      item.status !== PlannedMealStatus.CANCELLED &&
      (!date || item.date.toISOString().slice(0, 10) === date) &&
      item.participants.some((participant) => participant.adultProfileId === profileId),
  );
  const consumed = planned.filter(
    (item) =>
      item.mealId &&
      meals.some((meal) => meal.id === item.mealId || meal.plannedMealId === item.id),
  ).length;
  return {
    planned: planned.length,
    consumed,
    adherence: planned.length ? consumed / planned.length : null,
  };
}
