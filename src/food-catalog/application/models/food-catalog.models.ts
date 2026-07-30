export type FoodType = 'GENERIC' | 'COMMERCIAL' | 'CUSTOM' | 'PREPARED';
export type PreparationState = 'RAW' | 'COOKED' | 'READY_TO_EAT' | 'NOT_APPLICABLE';
export type ReferenceUnit = 'GRAM' | 'MILLILITER' | 'UNIT';
export type ConfidenceLevel = 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'USER_PROVIDED';

export interface CategoryView {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
}

export interface NutrientDefinitionView {
  id: string;
  code: string;
  name: string;
  unit: string;
  group: string;
  displayOrder: number;
  isRequired: boolean;
}

export interface FoodNutrientView {
  id: string;
  nutrientDefinition: NutrientDefinitionView;
  amount: number;
}

export interface FoodServingView {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  equivalentGrams: number | null;
  equivalentMilliliters: number | null;
}

export interface FoodSummaryView {
  id: string;
  householdId: string | null;
  name: string;
  brand: string | null;
  category: CategoryView;
  foodType: FoodType;
  preparationState: PreparationState;
  referenceQuantity: number;
  referenceUnit: ReferenceUnit;
  energyKcal: number | null;
  proteinGrams: number | null;
  carbohydrateGrams: number | null;
  fatGrams: number | null;
}

export interface FoodDetailView extends FoodSummaryView {
  description: string | null;
  source: string;
  sourceReference: string | null;
  confidenceLevel: ConfidenceLevel;
  isGlobal: boolean;
  nutrients: FoodNutrientView[];
  servings: FoodServingView[];
  aliases: string[];
}

export interface FoodSearchResult {
  items: FoodSummaryView[];
  page: number;
  limit: number;
  total: number;
}
