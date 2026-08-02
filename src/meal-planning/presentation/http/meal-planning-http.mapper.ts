import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MealPlanningDomainError } from '../../domain/errors/meal-planning.errors';
import type { WeeklyPlan } from '../../domain/entities/weekly-plan';
import type {
  PlannedMealParticipantProps,
  PlannedMealProps,
  WeeklyPlanProps,
} from '../../domain/models/meal-planning.models';
import {
  AdultProfileNotFoundError,
  PlannedMealNotFoundError,
  WeeklyPlanAccessDeniedError,
  WeeklyPlanAdminRequiredError,
  WeeklyPlanConflictError,
  WeeklyPlanNotFoundError,
} from '../../application/errors/meal-planning-application.errors';
import {
  PlanExecutionAccessError,
  PlanExecutionConflictError,
  PlanExecutionError,
  PlanExecutionNotFoundError,
} from '../../application/use-cases/plan-execution.use-cases';

export type WeeklyPlanResponse = Omit<WeeklyPlanProps, 'weeklyBudget' | 'meals'> & {
  weeklyBudget: string | null;
  meals: MealResponse[];
};

type MealResponse = Omit<PlannedMealProps, 'participants'> & {
  participants: ParticipantResponse[];
};

type ParticipantResponse = Omit<
  PlannedMealParticipantProps,
  'suggestedQuantity' | 'confirmedQuantity'
> & {
  suggestedQuantity: string | null;
  confirmedQuantity: string | null;
  status: string;
  consumedMealId: string | null;
};

export function toParticipantResponse(
  participant: PlannedMealParticipantProps,
): ParticipantResponse {
  return {
    ...participant,
    suggestedQuantity: participant.suggestedQuantity?.toString() ?? null,
    confirmedQuantity: participant.confirmedQuantity?.toString() ?? null,
    status: participant.status,
    consumedMealId: participant.consumedMealId,
  };
}

export interface WeeklyPlanListResponse {
  items: WeeklyPlanResponse[];
  page: number;
  limit: number;
  total: number;
}

type WeeklyPlanLike = Pick<WeeklyPlan, 'toProps'>;

export function toWeeklyPlanResponse(plan: WeeklyPlanLike): WeeklyPlanResponse {
  const props = plan.toProps();
  return {
    ...props,
    weeklyBudget: props.weeklyBudget?.toString() ?? null,
    meals: props.meals.map((meal): MealResponse => ({
      ...meal,
      nutritionSnapshot: meal.nutritionSnapshot,
      participants: meal.participants.map(toParticipantResponse),
    })),
  };
}
export function toListResponse(result: {
  items: WeeklyPlanLike[];
  page: number;
  limit: number;
  total: number;
}): WeeklyPlanListResponse {
  return { ...result, items: result.items.map((plan) => toWeeklyPlanResponse(plan)) };
}
export function rethrowMealPlanningHttpError(error: unknown): never {
  if (error instanceof PlanExecutionAccessError) throw new ForbiddenException(error.message);
  if (error instanceof PlanExecutionNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof PlanExecutionConflictError) throw new ConflictException(error.message);
  if (error instanceof PlanExecutionError) throw new BadRequestException(error.message);
  if (error instanceof WeeklyPlanAccessDeniedError || error instanceof WeeklyPlanAdminRequiredError)
    throw new ForbiddenException(error.message);
  if (
    error instanceof WeeklyPlanNotFoundError ||
    error instanceof PlannedMealNotFoundError ||
    error instanceof AdultProfileNotFoundError
  )
    throw new NotFoundException(error.message);
  if (error instanceof WeeklyPlanConflictError) throw new ConflictException(error.message);
  if (error instanceof MealPlanningDomainError) throw new BadRequestException(error.message);
  throw error;
}
