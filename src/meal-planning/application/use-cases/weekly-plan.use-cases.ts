import Decimal from 'decimal.js';
import type { HouseholdAccess } from '../../../households/application/models/household-access';
import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { WeeklyPlanStatus } from '../../domain/models/meal-planning.models';
import type { PlannedMealSource, PlannedMealType } from '../../domain/value-objects/planned-meal';
import { HouseholdId, WeeklyPlanId } from '../../domain/value-objects/identifiers';
import { WeekStart } from '../../domain/value-objects/planning-date';
import type {
  PaginatedWeeklyPlans,
  WeeklyPlanRepository,
} from '../ports/weekly-plan-repository.port';
import {
  WeeklyPlanAccessDeniedError,
  WeeklyPlanAdminRequiredError,
  WeeklyPlanConflictError,
  WeeklyPlanNotFoundError,
} from '../errors/meal-planning-application.errors';

export const CREATE_WEEKLY_PLAN_USE_CASE = Symbol('CreateWeeklyPlanUseCase');
export const GET_WEEKLY_PLAN_QUERY = Symbol('GetWeeklyPlanQuery');
export const LIST_WEEKLY_PLANS_QUERY = Symbol('ListWeeklyPlansQuery');
export const UPDATE_WEEKLY_PLAN_USE_CASE = Symbol('UpdateWeeklyPlanUseCase');
export const ACTIVATE_WEEKLY_PLAN_USE_CASE = Symbol('ActivateWeeklyPlanUseCase');
export const CANCEL_WEEKLY_PLAN_USE_CASE = Symbol('CancelWeeklyPlanUseCase');
export const COMPLETE_WEEKLY_PLAN_USE_CASE = Symbol('CompleteWeeklyPlanUseCase');

type Access = HouseholdRepository;

export class CreateWeeklyPlanUseCase {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(input: {
    actorId: string;
    householdId: string;
    weekStart: string | Date;
    weeklyBudget?: Decimal.Value | null;
    currency?: string | null;
  }): Promise<WeeklyPlan> {
    const access = await requireAccess(this.households, input.actorId, input.householdId);
    const plan = WeeklyPlan.create({
      id: crypto.randomUUID(),
      householdId: input.householdId,
      weekStart: WeekStart.normalize(input.weekStart).toDate(),
      weeklyBudget: input.weeklyBudget,
      currency: input.currency ?? access.household.currency,
      createdBy: input.actorId,
      createdAt: new Date(),
    });
    if (plan.currency !== access.household.currency)
      throw new WeeklyPlanConflictError('Plan currency must match the household currency.');
    const duplicate = await this.plans.findByHouseholdAndWeek(
      HouseholdId.from(input.householdId),
      WeekStart.from(plan.weekStart),
    );
    if (duplicate?.status === WeeklyPlanStatus.ACTIVE)
      throw new WeeklyPlanConflictError('An active plan already exists for this week.');
    await this.plans.save(plan);
    return plan;
  }
}

export class GetWeeklyPlanQuery {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(actorId: string, planId: string): Promise<WeeklyPlan> {
    const plan = await requirePlan(this.plans, planId);
    await requireAccess(this.households, actorId, plan.householdId);
    return plan;
  }
}

export class ListWeeklyPlansQuery {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(input: {
    actorId: string;
    householdId: string;
    status?: WeeklyPlanStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedWeeklyPlans> {
    await requireAccess(this.households, input.actorId, input.householdId);
    return this.plans.listByHousehold(HouseholdId.from(input.householdId), {
      status: input.status,
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    });
  }
}

export class UpdateWeeklyPlanUseCase {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(input: {
    actorId: string;
    planId: string;
    weeklyBudget?: Decimal.Value | null;
    currency?: string | null;
  }): Promise<WeeklyPlan> {
    const plan = await requirePlan(this.plans, input.planId);
    const access = await requireAccess(this.households, input.actorId, plan.householdId);
    if (
      input.currency !== undefined &&
      input.currency !== null &&
      input.currency.trim() !== access.household.currency
    )
      throw new WeeklyPlanConflictError('Plan currency must match the household currency.');
    plan.update({
      weeklyBudget: input.weeklyBudget,
      currency: input.currency,
      occurredAt: new Date(),
    });
    await this.plans.save(plan);
    return plan;
  }
}

export class ActivateWeeklyPlanUseCase {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(actorId: string, planId: string): Promise<WeeklyPlan> {
    return transition(this.households, this.plans, actorId, planId, 'activate');
  }
}
export class CompleteWeeklyPlanUseCase {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(actorId: string, planId: string): Promise<WeeklyPlan> {
    return transition(this.households, this.plans, actorId, planId, 'complete');
  }
}
export class CancelWeeklyPlanUseCase {
  constructor(
    private readonly households: Access,
    private readonly plans: WeeklyPlanRepository,
  ) {}
  async execute(actorId: string, planId: string): Promise<WeeklyPlan> {
    return transition(this.households, this.plans, actorId, planId, 'cancel');
  }
}

async function transition(
  households: Access,
  plans: WeeklyPlanRepository,
  actorId: string,
  id: string,
  action: 'activate' | 'complete' | 'cancel',
): Promise<WeeklyPlan> {
  const plan = await requirePlan(plans, id);
  await requireAdmin(households, actorId, plan.householdId);
  if (action === 'activate') plan.activate();
  if (action === 'complete') plan.complete();
  if (action === 'cancel') plan.cancel();
  await plans.save(plan);
  return plan;
}

export async function requirePlan(plans: WeeklyPlanRepository, id: string): Promise<WeeklyPlan> {
  const plan = await plans.findById(WeeklyPlanId.from(id));
  if (!plan) throw new WeeklyPlanNotFoundError('Weekly plan not found.');
  return plan;
}

export async function requireAccess(
  households: Access,
  actorId: string,
  householdId: string,
): Promise<HouseholdAccess> {
  const access = await households.findAccess(actorId, householdId);
  if (!access || access.status !== 'ACTIVE')
    throw new WeeklyPlanAccessDeniedError('The household is not accessible to the user.');
  return access;
}

async function requireAdmin(
  households: Access,
  actorId: string,
  householdId: string,
): Promise<void> {
  const access = await requireAccess(households, actorId, householdId);
  if (access.role !== 'ADMIN')
    throw new WeeklyPlanAdminRequiredError(
      'Only household administrators can perform this action.',
    );
}

export interface PlannedMealInput {
  date: string | Date;
  type: PlannedMealType;
  source: PlannedMealSource;
  recipeId?: string | null;
  nameSnapshot?: string | null;
  notes?: string | null;
  position: number;
}
