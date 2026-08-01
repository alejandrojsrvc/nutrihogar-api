import type { WeeklyPlan } from '../../domain/entities/weekly-plan';
import type { HouseholdId, WeeklyPlanId } from '../../domain/value-objects/identifiers';
import type { WeekStart } from '../../domain/value-objects/planning-date';
import type { WeeklyPlanStatus } from '../../domain/models/meal-planning.models';

export const WEEKLY_PLAN_REPOSITORY = Symbol('WeeklyPlanRepository');

export interface WeeklyPlanFilters {
  status?: WeeklyPlanStatus;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedWeeklyPlans {
  items: WeeklyPlan[];
  page: number;
  limit: number;
  total: number;
}

export interface WeeklyPlanRepository {
  findById(id: WeeklyPlanId): Promise<WeeklyPlan | null>;
  findByMealId(mealId: string): Promise<WeeklyPlan | null>;
  findByParticipantId(participantId: string): Promise<WeeklyPlan | null>;
  findByHouseholdAndWeek(
    householdId: HouseholdId,
    weekStart: WeekStart,
  ): Promise<WeeklyPlan | null>;
  save(plan: WeeklyPlan): Promise<void>;
  deleteParticipant(participantId: string): Promise<void>;
  listByHousehold(
    householdId: HouseholdId,
    filters: WeeklyPlanFilters,
  ): Promise<PaginatedWeeklyPlans>;
}
