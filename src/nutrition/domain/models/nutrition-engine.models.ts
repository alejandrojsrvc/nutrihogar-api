import Decimal from 'decimal.js';

export type BaseFoodUnit = 'GRAM' | 'MILLILITER' | 'UNIT';
export type ConsumedFoodUnit = BaseFoodUnit | 'SERVING';

export interface FoodNutrientData {
  code: string;
  amount: Decimal.Value;
}

export interface FoodServingData {
  id: string;
  quantity: Decimal.Value;
  equivalentGrams: Decimal.Value | null;
  equivalentMilliliters: Decimal.Value | null;
}

export interface NutritionFoodData {
  id: string;
  preparationState: 'RAW' | 'COOKED' | 'READY_TO_EAT' | 'NOT_APPLICABLE';
  referenceQuantity: Decimal.Value;
  referenceUnit: BaseFoodUnit;
  nutrients: FoodNutrientData[];
  servings: FoodServingData[];
}

export interface FoodConsumptionInput {
  quantity: Decimal.Value;
  unit: ConsumedFoodUnit;
  servingId?: string;
}

export interface BaseFoodQuantity {
  quantity: Decimal;
  unit: BaseFoodUnit;
}

export type NutrientAmounts = Record<string, Decimal>;

export interface NutritionCalculation {
  baseQuantity: Decimal;
  baseUnit: BaseFoodUnit;
  nutrients: NutrientAmounts;
}

export interface PresentedNutritionCalculation {
  baseQuantity: number;
  baseUnit: BaseFoodUnit;
  nutrients: Record<string, number>;
}
