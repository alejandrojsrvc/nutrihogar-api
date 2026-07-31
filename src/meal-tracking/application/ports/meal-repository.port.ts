import Decimal from 'decimal.js';
import {
  MealConfidenceLevel,
  MealMeasurementMethod,
  MealSource,
  MealType,
  MealView,
} from '../../domain/models/meal.models';

export const MEAL_REPOSITORY = Symbol('MealRepository');
export const MEAL_UNIT_OF_WORK = Symbol('MealUnitOfWork');

export type MealHouseholdRole = 'ADMIN' | 'MEMBER';

export interface MealHouseholdAccess {
  role: MealHouseholdRole;
  timezone: string;
}

export interface MealNutrientSnapshotInput {
  code: string;
  name: string;
  unit: string;
  amount: Decimal;
}

export interface MealItemInput {
  foodId: string | null;
  foodServingId?: string | null;
  nameSnapshot: string;
  brandSnapshot: string | null;
  preparationStateSnapshot: string;
  quantity: Decimal;
  unit: string;
  baseQuantity: Decimal;
  baseUnit: string;
  measurementMethod: MealMeasurementMethod;
  confidenceLevel: MealConfidenceLevel;
  nutrients: MealNutrientSnapshotInput[];
}

export interface CreateMealInput {
  householdId: string;
  adultProfileId: string;
  mealType: MealType;
  consumedAt: Date;
  notes: string | null;
  createdById: string;
  source: MealSource;
  items: MealItemInput[];
}

export interface ReplaceMealInput extends CreateMealInput {
  mealId: string;
}

export interface CancelMealInput {
  mealId: string;
  deletedAt: Date;
}

export interface MealListCriteria {
  householdId: string;
  adultProfileId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  mealType?: MealType;
  includeCancelled: boolean;
  page: number;
  limit: number;
}

export interface MealListResult {
  items: MealView[];
  page: number;
  limit: number;
  total: number;
}

export interface MealRepository {
  findHouseholdAccess(actorId: string, householdId: string): Promise<MealHouseholdAccess | null>;
  hasActiveProfile(adultProfileId: string, householdId: string): Promise<boolean>;
  findById(mealId: string): Promise<MealView | null>;
  list(criteria: MealListCriteria): Promise<MealListResult>;
}

export interface MealUnitOfWork {
  create(input: CreateMealInput): Promise<MealView>;
  replace(input: ReplaceMealInput): Promise<MealView | null>;
  cancel(input: CancelMealInput): Promise<boolean>;
}
