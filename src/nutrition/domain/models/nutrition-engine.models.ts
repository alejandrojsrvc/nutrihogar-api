import Decimal from 'decimal.js';

export type BaseFoodUnit = 'GRAM' | 'MILLILITER' | 'UNIT';
export type ConsumedFoodUnit = BaseFoodUnit | 'SERVING';

export interface FoodNutrientData {
  code: string;
  amount: Decimal.Value;
  name?: string;
  unit?: string;
}

export interface FoodServingData {
  id: string;
  quantity: Decimal.Value;
  equivalentGrams: Decimal.Value | null;
  equivalentMilliliters: Decimal.Value | null;
}

export interface NutritionFoodData {
  id: string;
  name?: string;
  brand?: string | null;
  preparationState: 'RAW' | 'COOKED' | 'READY_TO_EAT' | 'NOT_APPLICABLE';
  confidenceLevel?: 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'USER_PROVIDED';
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
  foodId?: string;
  foodName?: string;
  foodBrand?: string | null;
  preparationState?: NutritionFoodData['preparationState'];
  confidenceLevel?: NutritionFoodData['confidenceLevel'];
  baseQuantity: Decimal;
  baseUnit: BaseFoodUnit;
  nutrients: NutrientAmounts;
  nutrientMetadata: Record<string, { name: string; unit: string }>;
}

export interface PresentedNutritionCalculation {
  baseQuantity: number;
  baseUnit: BaseFoodUnit;
  nutrients: Record<string, number>;
}
