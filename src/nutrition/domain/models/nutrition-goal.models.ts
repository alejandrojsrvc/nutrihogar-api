import Decimal from 'decimal.js';

export type NutritionGoalSuggestionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';
export type CalculationSnapshotValue =
  string | number | boolean | null | CalculationSnapshot | CalculationSnapshotValue[];
export type CalculationSnapshot = { [key: string]: CalculationSnapshotValue };

export interface NutritionValues {
  calories: Decimal;
  proteinGrams: Decimal;
  carbohydrateGrams: Decimal;
  fatGrams: Decimal;
  fiberGrams: Decimal;
}

export interface NutritionGoalSuggestionView {
  id: string;
  adultProfileId: string;
  calculationMethod: string;
  calculationInput: CalculationSnapshot;
  bmr: Decimal;
  tdee: Decimal;
  values: NutritionValues;
  status: NutritionGoalSuggestionStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface NutritionGoalView {
  id: string;
  adultProfileId: string;
  validFrom: Date;
  validUntil: Date | null;
  values: NutritionValues;
  goalType: string;
  calculationMethod: string;
  calculationInput: CalculationSnapshot;
  confirmedById: string;
  createdAt: Date;
  updatedAt: Date;
}
