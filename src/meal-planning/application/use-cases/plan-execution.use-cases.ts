import Decimal from 'decimal.js';
import type { HouseholdAccess } from '../../../households/application/models/household-access';
import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { HouseholdId, WeeklyPlanId } from '../../domain/value-objects/identifiers';
import { WeekStart } from '../../domain/value-objects/planning-date';
import { PlannedMealSource, PlannedMealStatus } from '../../domain/value-objects/planned-meal';
import type { WeeklyPlanRepository } from '../ports/weekly-plan-repository.port';
import type { PreparedBatchRepository } from '../../../recipes/application/ports/prepared-batch-repository.port';
import type { StartPreparedBatchUseCase } from '../../../recipes/application/use-cases/start-prepared-batch.use-case';
import type { MealRepository } from '../../../meal-tracking/application/ports/meal-repository.port';
import type { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { participantQuantity } from '../services/quantity-suggestion.service';

export const START_PREPARATION_FROM_PLANNED_MEAL_USE_CASE = Symbol(
  'StartPreparationFromPlannedMealUseCase',
);
export const LINK_CONSUMED_MEAL_TO_PLANNED_MEAL_USE_CASE = Symbol(
  'LinkConsumedMealToPlannedMealUseCase',
);
export const CALCULATE_WEEKLY_ADHERENCE_USE_CASE = Symbol('CalculateWeeklyAdherenceUseCase');

export class PlanExecutionError extends Error {}
export class PlanExecutionNotFoundError extends PlanExecutionError {}
export class PlanExecutionConflictError extends PlanExecutionError {}
export class PlanExecutionAccessError extends PlanExecutionError {}

export class StartPreparationFromPlannedMealUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly plans: WeeklyPlanRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly startBatch: StartPreparedBatchUseCase,
  ) {}

  async execute(actorId: string, plannedMealId: string) {
    const plan = await this.plans.findByMealId(plannedMealId);
    if (!plan) throw new PlanExecutionNotFoundError('Planned meal was not found.');
    await requireAccess(this.households, actorId, plan.householdId);
    const meal = plan.meals.find((item) => item.id === plannedMealId)!;
    if (meal.source !== PlannedMealSource.RECIPE || !meal.recipeId)
      throw new PlanExecutionConflictError('Only recipe meals can be prepared.');
    if (meal.status !== PlannedMealStatus.PLANNED)
      throw new PlanExecutionConflictError('Planned meal is not in PLANNED status.');
    const existing = await this.batches.findByPlannedMealId(plannedMealId);
    if (meal.preparedBatchId && !existing)
      throw new PlanExecutionConflictError('An active preparation already exists.');
    if (existing && !['CANCELLED', 'FINALIZED'].includes(existing.status))
      throw new PlanExecutionConflictError('An active preparation already exists.');
    const batch = await this.startBatch.execute({
      actorId,
      recipeId: meal.recipeId,
      preparedAt: meal.date,
    });
    plan.prepareMeal(plannedMealId, batch.id, new Date());
    await this.plans.save(plan);
    return batch;
  }

  async get(actorId: string, plannedMealId: string) {
    const plan = await this.plans.findByMealId(plannedMealId);
    if (!plan) throw new PlanExecutionNotFoundError('Planned meal was not found.');
    await requireAccess(this.households, actorId, plan.householdId);
    const batch = await this.batches.findByPlannedMealId(plannedMealId);
    if (!batch) throw new PlanExecutionNotFoundError('Preparation was not found.');
    return batch;
  }
}

export class LinkConsumedMealToPlannedMealUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly plans: WeeklyPlanRepository,
    private readonly meals: MealRepository,
  ) {}

  async execute(actorId: string, consumedMealId: string, plannedMealId: string) {
    const consumed = await this.meals.findById(consumedMealId);
    if (!consumed) throw new PlanExecutionNotFoundError('Consumed meal was not found.');
    const plan = await this.plans.findByMealId(plannedMealId);
    if (!plan) throw new PlanExecutionNotFoundError('Planned meal was not found.');
    const access = await requireAccess(this.households, actorId, plan.householdId);
    if (consumed.householdId !== plan.householdId || consumed.status !== 'CONFIRMED')
      throw new PlanExecutionConflictError('Consumed meal is not compatible with the household.');
    const planned = plan.meals.find((item) => item.id === plannedMealId)!;
    if (planned.mealId)
      throw new PlanExecutionConflictError('Planned meal already has a consumption linked.');
    if (
      !planned.participants.some(
        (participant) => participant.adultProfileId === consumed.adultProfileId,
      )
    )
      throw new PlanExecutionConflictError('Consumed meal adult does not participate in the plan.');
    if (
      calendarDate(planned.date, access.household.timezone) !==
      calendarDate(consumed.consumedAt, access.household.timezone)
    )
      throw new PlanExecutionConflictError('Consumed meal date does not match the plan.');
    if (plan.meals.some((item) => item.mealId === consumedMealId))
      throw new PlanExecutionConflictError('Consumed meal is already linked to a plan.');
    plan.consumeMeal(plannedMealId, consumedMealId);
    await this.plans.save(plan);
    return plan;
  }

  async get(actorId: string, plannedMealId: string) {
    const plan = await this.plans.findByMealId(plannedMealId);
    if (!plan) throw new PlanExecutionNotFoundError('Planned meal was not found.');
    await requireAccess(this.households, actorId, plan.householdId);
    const planned = plan.meals.find((item) => item.id === plannedMealId)!;
    return planned.mealId ? this.meals.findById(planned.mealId) : null;
  }
}

const FINAL_STATUSES = new Set<PlannedMealStatus>([
  PlannedMealStatus.CONSUMED,
  PlannedMealStatus.SKIPPED,
  PlannedMealStatus.CANCELLED,
  PlannedMealStatus.REPLACED,
]);

export class CalculateWeeklyAdherenceUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly plans: WeeklyPlanRepository,
    private readonly meals: MealRepository,
  ) {}

  async execute(
    actorId: string,
    input: { weeklyPlanId?: string; householdId?: string; weekStart?: string | Date },
  ) {
    const plan = input.weeklyPlanId
      ? await this.plans.findById(WeeklyPlanId.from(input.weeklyPlanId))
      : await this.plans.findByHouseholdAndWeek(
          HouseholdId.from(input.householdId!),
          WeekStart.from(input.weekStart!),
        );
    if (!plan) throw new PlanExecutionNotFoundError('Weekly plan was not found.');
    await requireAccess(this.households, actorId, plan.householdId);
    const from = new Date(plan.weekStart);
    const to = new Date(plan.weekEnd);
    to.setUTCDate(to.getUTCDate() + 1);
    const consumed = await this.meals.list({
      householdId: plan.householdId,
      dateFrom: from,
      dateTo: to,
      includeCancelled: true,
      page: 1,
      limit: 10000,
    });
    const finalMeals = plan.meals.filter((meal) => FINAL_STATUSES.has(meal.status));
    const counts = {
      planned: finalMeals.length,
      consumed: finalMeals.filter((meal) => meal.status === PlannedMealStatus.CONSUMED).length,
      skipped: 0,
      cancelled: 0,
      replaced: 0,
      unplanned: consumed.items.filter(
        (meal) => !plan.meals.some((planned) => planned.mealId === meal.id),
      ).length,
    };
    counts.skipped = finalMeals.filter((meal) => meal.status === PlannedMealStatus.SKIPPED).length;
    counts.cancelled = finalMeals.filter(
      (meal) => meal.status === PlannedMealStatus.CANCELLED,
    ).length;
    counts.replaced = finalMeals.filter(
      (meal) => meal.status === PlannedMealStatus.REPLACED,
    ).length;
    const plannedNutrition = sumPlannedNutrition(finalMeals);
    const consumedNutrition = sumConsumedNutrition(
      consumed.items.filter((meal) => meal.status === 'CONFIRMED'),
    );
    const warnings = finalMeals
      .filter((meal) => !meal.nutritionSnapshot)
      .map((meal) => `Nutrition snapshot unavailable for planned meal ${meal.id}.`);
    const byDay = new Map<string, { planned: number; consumed: number }>();
    for (const meal of finalMeals) {
      const day = calendarDate(meal.date);
      const current = byDay.get(day) ?? { planned: 0, consumed: 0 };
      current.planned += 1;
      if (meal.status === PlannedMealStatus.CONSUMED) current.consumed += 1;
      byDay.set(day, current);
    }
    const byAdult = new Map<string, { planned: number; consumed: number }>();
    for (const meal of finalMeals)
      for (const participant of meal.participants) {
        const current = byAdult.get(participant.adultProfileId) ?? { planned: 0, consumed: 0 };
        current.planned += 1;
        if (meal.status === PlannedMealStatus.CONSUMED) current.consumed += 1;
        byAdult.set(participant.adultProfileId, current);
      }
    return {
      weeklyPlanId: plan.id,
      weekStart: calendarDate(plan.weekStart),
      counts,
      percentages: {
        consumed: percent(counts.consumed, counts.planned),
        unplanned: percent(counts.unplanned, consumed.items.length),
      },
      nutrition: {
        plannedCalories: plannedNutrition.calories.toString(),
        consumedCalories: consumedNutrition.calories.toString(),
        plannedProtein: plannedNutrition.protein.toString(),
        consumedProtein: consumedNutrition.protein.toString(),
        caloriePercentage: ratio(consumedNutrition.calories, plannedNutrition.calories),
        proteinPercentage: ratio(consumedNutrition.protein, plannedNutrition.protein),
      },
      breakdown: {
        byDay: Object.fromEntries([...byDay.entries()].sort()),
        byAdult: Object.fromEntries([...byAdult.entries()].sort()),
      },
      warnings,
    };
  }
}

async function requireAccess(
  households: HouseholdRepository,
  actorId: string,
  householdId: string,
): Promise<HouseholdAccess> {
  const access = await households.findAccess(actorId, householdId);
  if (!access || access.status !== 'ACTIVE')
    throw new PlanExecutionAccessError('Household access denied.');
  return access;
}
function calendarDate(value: Date, timezone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}
function percent(value: number, total: number): string {
  return total ? new Decimal(value).div(total).times(100).toDecimalPlaces(2).toString() : '0';
}
function ratio(value: Decimal, total: Decimal): string {
  return total.isZero() ? '0' : value.div(total).times(100).toDecimalPlaces(2).toString();
}
function nutritionValue(snapshot: Record<string, unknown> | null, key: string): Decimal {
  const aliases =
    key === 'protein'
      ? ['protein', 'proteinGrams', 'protein_grams']
      : ['calories', 'energy', 'energyKcal'];
  const value = aliases.map((alias) => snapshot?.[alias]).find((item) => item !== undefined);
  try {
    return new Decimal(value as Decimal.Value);
  } catch {
    return new Decimal(0);
  }
}
function sumPlannedNutrition(meals: ReturnType<WeeklyPlan['toProps']>['meals']) {
  return meals.reduce(
    (sum, meal) => {
      const servings = plannedMealServings(meal);
      return {
        calories: sum.calories.plus(
          nutritionValue(meal.nutritionSnapshot, 'calories').times(servings),
        ),
        protein: sum.protein.plus(
          nutritionValue(meal.nutritionSnapshot, 'protein').times(servings),
        ),
      };
    },
    { calories: new Decimal(0), protein: new Decimal(0) },
  );
}
function plannedMealServings(meal: ReturnType<WeeklyPlan['toProps']>['meals'][number]): Decimal {
  if (meal.participants.length === 0) return new Decimal(1);
  return meal.participants.reduce((sum, participant) => {
    const quantity = participantQuantity(participant);
    if (quantity && quantity.unit === 'SERVING') return sum.plus(quantity.quantity);
    return sum.plus(1);
  }, new Decimal(0));
}
function sumConsumedNutrition(meals: Awaited<ReturnType<MealRepository['list']>>['items']) {
  return meals.reduce(
    (sum, meal) =>
      meal.items.reduce(
        (inner, item) => ({
          calories: inner.calories.plus(
            item.nutrients.find((nutrient) =>
              ['calories', 'energy', 'energy_kcal'].includes(nutrient.nutrientCode.toLowerCase()),
            )?.amount ?? 0,
          ),
          protein: inner.protein.plus(
            item.nutrients.find((nutrient) =>
              ['protein', 'protein_g', 'protein_grams'].includes(
                nutrient.nutrientCode.toLowerCase(),
              ),
            )?.amount ?? 0,
          ),
        }),
        sum,
      ),
    { calories: new Decimal(0), protein: new Decimal(0) },
  );
}
