import Decimal from 'decimal.js';
import type {
  PlannedMealSource,
  PlannedMealStatus,
  PlannedMealType,
} from '../value-objects/planned-meal';

export type NutritionTargetSnapshot = Record<string, unknown>;

export enum PlannedMealParticipantStatus {
  PLANNED = 'PLANNED',
  CONSUMED = 'CONSUMED',
  SKIPPED = 'SKIPPED',
}

export interface PlannedMealParticipantProps {
  id: string;
  adultProfileId: string;
  suggestedQuantity: Decimal | null;
  suggestedUnit: string | null;
  confirmedQuantity: Decimal | null;
  confirmedUnit: string | null;
  confirmedById?: string | null;
  confirmedAt?: Date | null;
  confirmationSnapshot?: Record<string, unknown> | null;
  nutritionTargetSnapshot: NutritionTargetSnapshot | null;
  status: PlannedMealParticipantStatus;
  consumedMealId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlannedMealProps {
  id: string;
  date: Date;
  type: PlannedMealType;
  source: PlannedMealSource;
  recipeId: string | null;
  nameSnapshot: string | null;
  notes: string | null;
  nutritionSnapshot: NutritionTargetSnapshot | null;
  status: PlannedMealStatus;
  participants: PlannedMealParticipantProps[];
  position: number;
  replacedMealId: string | null;
  preparedBatchId: string | null;
  mealId: string | null;
  previousMealId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyPlanProps {
  id: string;
  householdId: string;
  weekStart: Date;
  weekEnd: Date;
  status: WeeklyPlanStatus;
  weeklyBudget: Decimal | null;
  currency: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  meals: PlannedMealProps[];
}

export enum WeeklyPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
