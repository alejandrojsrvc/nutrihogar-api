import Decimal from 'decimal.js';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import type { WeeklyPlanProps } from '../../domain/models/meal-planning.models';
import { WeeklyPlanStatus } from '../../domain/models/meal-planning.models';
import { PrismaPlannedMealMapper } from './prisma-planned-meal.mapper';
import type { PrismaPlannedMealRecord } from './prisma-planned-meal.mapper';

export interface PrismaWeeklyPlanRecord {
  id: string;
  householdId: string;
  weekStart: Date;
  weekEnd: Date;
  status: string;
  weeklyBudget: { toString(): string } | null;
  currency: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  meals: PrismaPlannedMealRecord[];
}

export class PrismaWeeklyPlanMapper {
  static toDomain(record: PrismaWeeklyPlanRecord): WeeklyPlan {
    const props: WeeklyPlanProps = {
      id: record.id,
      householdId: record.householdId,
      weekStart: new Date(record.weekStart),
      weekEnd: new Date(record.weekEnd),
      status: record.status as WeeklyPlanStatus,
      weeklyBudget:
        record.weeklyBudget == null ? null : new Decimal(record.weeklyBudget.toString()),
      currency: record.currency,
      createdBy: record.createdById,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      publishedAt: record.publishedAt == null ? null : new Date(record.publishedAt),
      meals: record.meals.map((meal) => PrismaPlannedMealMapper.toDomain(meal)),
    };
    return WeeklyPlan.reconstitute(props);
  }

  static toPersistence(plan: WeeklyPlan): {
    id: string;
    householdId: string;
    weekStart: Date;
    weekEnd: Date;
    status: WeeklyPlanStatus;
    weeklyBudget: string | null;
    currency: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
    meals: ReturnType<typeof PrismaPlannedMealMapper.toPersistence>[];
  } {
    const props = plan.toProps();
    return {
      id: props.id,
      householdId: props.householdId,
      weekStart: new Date(props.weekStart),
      weekEnd: new Date(props.weekEnd),
      status: props.status,
      weeklyBudget: props.weeklyBudget?.toString() ?? null,
      currency: props.currency,
      createdById: props.createdBy,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      publishedAt: props.publishedAt == null ? null : new Date(props.publishedAt),
      meals: props.meals.map((meal) => PrismaPlannedMealMapper.toPersistence(meal, props.id)),
    };
  }
}
