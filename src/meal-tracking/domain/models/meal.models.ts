import Decimal from 'decimal.js';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER' | 'EXTRA';
export type MealStatus = 'CONFIRMED' | 'CANCELLED';
export type MealSource = 'MANUAL' | 'DUPLICATED' | 'PREPARED_BATCH';
export type MealMeasurementMethod = 'WEIGHED' | 'SERVING' | 'UNIT' | 'APPROXIMATED';
export type MealConfidenceLevel = 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'USER_PROVIDED';

export interface MealNutrientSnapshotView {
  id: string;
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  amount: Decimal;
}

export interface MealItemView {
  id: string;
  foodId: string | null;
  foodServingId: string | null;
  nameSnapshot: string;
  brandSnapshot: string | null;
  preparationStateSnapshot: string;
  quantity: Decimal;
  unit: string;
  baseQuantity: Decimal;
  baseUnit: string;
  measurementMethod: MealMeasurementMethod;
  confidenceLevel: MealConfidenceLevel;
  nutrients: MealNutrientSnapshotView[];
}

export interface MealView {
  id: string;
  householdId: string;
  adultProfileId: string;
  mealType: MealType;
  consumedAt: Date;
  status: MealStatus;
  source: MealSource;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: MealItemView[];
}
