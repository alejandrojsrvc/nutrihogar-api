import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import {
  PlannedMealSource,
  PlannedMealStatus,
  PlannedMealType,
} from '../../domain/value-objects/planned-meal';
import {
  StartPreparationFromPlannedMealUseCase,
  LinkConsumedMealToPlannedMealUseCase,
  CalculateWeeklyAdherenceUseCase,
} from './plan-execution.use-cases';
import Decimal from 'decimal.js';
import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type { MealRepository } from '../../../meal-tracking/application/ports/meal-repository.port';
import type { PreparedBatchRepository } from '../../../recipes/application/ports/prepared-batch-repository.port';
import type { PreparedBatch } from '../../../recipes/domain/entities/prepared-batch';
import type { StartPreparedBatchUseCase } from '../../../recipes/application/use-cases/start-prepared-batch.use-case';
import type { WeeklyPlanRepository } from '../ports/weekly-plan-repository.port';

function activePlan() {
  const plan = WeeklyPlan.create({
    id: 'plan',
    householdId: 'home',
    weekStart: '2026-08-03',
    createdBy: 'user',
    createdAt: new Date('2026-08-03'),
  });
  plan.addMeal({
    id: 'planned',
    date: '2026-08-03',
    type: PlannedMealType.LUNCH,
    source: PlannedMealSource.RECIPE,
    recipeId: 'recipe',
    position: 0,
    occurredAt: new Date('2026-08-03'),
  });
  plan.assignParticipant('planned', {
    id: 'participant',
    adultProfileId: 'adult',
    occurredAt: new Date('2026-08-03'),
  });
  plan.activate(new Date('2026-08-03'));
  return plan;
}

const access = {
  findAccess: jest
    .fn()
    .mockResolvedValue({ status: 'ACTIVE', household: { currency: 'ARS', timezone: 'UTC' } }),
} as unknown as HouseholdRepository;

describe('plan execution use cases', () => {
  it('starts one compatible preparation and transitions the planned meal', async () => {
    const plan = activePlan();
    const batch = { id: 'batch', status: 'DRAFT' } as unknown as PreparedBatch;
    const plans = {
      findByMealId: jest.fn().mockResolvedValue(plan),
      save: jest.fn(),
    } as unknown as WeeklyPlanRepository;
    const batches = {
      findByPlannedMealId: jest.fn().mockResolvedValue(null),
    } as unknown as PreparedBatchRepository;
    const startExecute = jest.fn().mockResolvedValue(batch);
    const start = { execute: startExecute } as unknown as StartPreparedBatchUseCase;
    await new StartPreparationFromPlannedMealUseCase(access, plans, batches, start).execute(
      'user',
      'planned',
    );
    expect(startExecute).toHaveBeenCalledWith({
      actorId: 'user',
      recipeId: 'recipe',
      preparedAt: new Date('2026-08-03'),
    });
    expect(plan.meals[0].status).toBe('PREPARED');
    expect(plan.meals[0].preparedBatchId).toBe('batch');
  });

  it('links only a same-day participating adult and changes the plan to consumed', async () => {
    const plan = activePlan();
    const plans = {
      findByMealId: jest.fn().mockResolvedValue(plan),
      save: jest.fn(),
    } as unknown as WeeklyPlanRepository;
    const meal = {
      id: 'meal',
      householdId: 'home',
      adultProfileId: 'adult',
      consumedAt: new Date('2026-08-03T12:00:00Z'),
      status: 'CONFIRMED',
    } as unknown as Awaited<ReturnType<MealRepository['findById']>>;
    const meals = { findById: jest.fn().mockResolvedValue(meal) } as unknown as MealRepository;
    await new LinkConsumedMealToPlannedMealUseCase(access, plans, meals).execute(
      'user',
      'meal',
      'planned',
    );
    expect(plan.meals[0].status).toBe('CONSUMED');
    expect(plan.meals[0].mealId).toBe('meal');
  });

  it('calculates deterministic final-status and snapshot nutrition metrics', async () => {
    const plan = activePlan();
    const props = plan.toProps();
    props.meals[0].nutritionSnapshot = { calories: '500', protein: '30' };
    const measured = {
      id: 'meal',
      householdId: 'home',
      adultProfileId: 'adult',
      consumedAt: new Date('2026-08-03T12:00:00Z'),
      status: 'CONFIRMED',
      items: [
        {
          nutrients: [
            { nutrientCode: 'calories', amount: new Decimal(450) },
            { nutrientCode: 'protein', amount: new Decimal(25) },
          ],
        },
      ],
    } as unknown as Awaited<ReturnType<MealRepository['findById']>>;
    props.meals[0].status = PlannedMealStatus.CONSUMED;
    props.meals[0].mealId = 'meal';
    const rebuilt = WeeklyPlan.reconstitute(props);
    const plans = {
      findById: jest.fn().mockResolvedValue(rebuilt),
    } as unknown as WeeklyPlanRepository;
    const meals = {
      list: jest.fn().mockResolvedValue({ items: [measured], page: 1, limit: 10000, total: 1 }),
    } as unknown as MealRepository;
    const result = await new CalculateWeeklyAdherenceUseCase(access, plans, meals).execute('user', {
      weeklyPlanId: 'plan',
    });
    expect(result.counts).toMatchObject({ planned: 1, consumed: 1, unplanned: 0 });
    expect(result.nutrition.plannedCalories).toBe('500');
    expect(result.nutrition.consumedCalories).toBe('450');
  });

  it('scales planned nutrition by confirmed servings per participant', async () => {
    const plan = WeeklyPlan.create({
      id: 'plan',
      householdId: 'home',
      weekStart: '2026-08-03',
      createdBy: 'user',
      createdAt: new Date('2026-08-03'),
    });
    plan.addMeal({
      id: 'planned',
      date: '2026-08-03',
      type: PlannedMealType.LUNCH,
      source: PlannedMealSource.RECIPE,
      recipeId: 'recipe',
      position: 0,
      occurredAt: new Date('2026-08-03'),
    });
    plan.assignParticipant('planned', {
      id: 'participant-1',
      adultProfileId: 'adult-1',
      occurredAt: new Date('2026-08-03'),
    });
    plan.assignParticipant('planned', {
      id: 'participant-2',
      adultProfileId: 'adult-2',
      occurredAt: new Date('2026-08-03'),
    });
    plan.activate(new Date('2026-08-03'));
    plan.confirmParticipantQuantity(
      'planned',
      'participant-1',
      2,
      'SERVING',
      'user',
      new Date('2026-08-03T10:00:00Z'),
    );
    plan.confirmParticipantQuantity(
      'planned',
      'participant-2',
      1,
      'SERVING',
      'user',
      new Date('2026-08-03T10:00:00Z'),
    );

    const props = plan.toProps();
    props.meals[0].nutritionSnapshot = { energyKcal: '500', protein: '30' };
    props.meals[0].status = PlannedMealStatus.CONSUMED;
    props.meals[0].mealId = 'meal';
    const rebuilt = WeeklyPlan.reconstitute(props);
    const plans = {
      findById: jest.fn().mockResolvedValue(rebuilt),
    } as unknown as WeeklyPlanRepository;
    const meals = {
      list: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 10000, total: 0 }),
    } as unknown as MealRepository;
    const result = await new CalculateWeeklyAdherenceUseCase(access, plans, meals).execute('user', {
      weeklyPlanId: 'plan',
    });
    expect(result.nutrition.plannedCalories).toBe('1500');
    expect(result.nutrition.plannedProtein).toBe('90');
  });
});
