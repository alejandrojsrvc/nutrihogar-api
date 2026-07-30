import {
  ConfidenceLevel,
  FoodDetailView,
  FoodType,
  PreparationState,
  ReferenceUnit,
} from '../models/food-catalog.models';

export const FOOD_HOUSEHOLD_ACCESS_REPOSITORY = Symbol('FoodHouseholdAccessRepository');
export const FOOD_CATALOG_MUTATION_REPOSITORY = Symbol('FoodCatalogMutationRepository');
export const FOOD_CATALOG_UNIT_OF_WORK = Symbol('FoodCatalogUnitOfWork');

export interface FoodHouseholdAccessRepository {
  isActiveMember(actorId: string, householdId: string): Promise<boolean>;
}

export interface FoodMutationTarget {
  id: string;
  householdId: string | null;
  foodType: FoodType;
  isGlobal: boolean;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface FoodCatalogMutationRepository {
  findTarget(foodId: string): Promise<FoodMutationTarget | null>;
}

export interface FoodNutrientInput {
  nutrientDefinitionId: string;
  amount: number;
}

export interface FoodServingInput {
  name: string;
  quantity: number;
  unit: string;
  equivalentGrams?: number | null;
  equivalentMilliliters?: number | null;
}

export interface CreateCustomFoodInput {
  householdId: string;
  createdById: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  categoryId: string;
  preparationState: PreparationState;
  referenceQuantity: number;
  referenceUnit: ReferenceUnit;
  source: string;
  confidenceLevel: ConfidenceLevel;
  nutrients: FoodNutrientInput[];
  servings: FoodServingInput[];
}

export interface UpdateCustomFoodInput {
  name?: string;
  brand?: string | null;
  description?: string | null;
  categoryId?: string;
  preparationState?: PreparationState;
  referenceQuantity?: number;
  referenceUnit?: ReferenceUnit;
  source?: string;
  confidenceLevel?: ConfidenceLevel;
  nutrients?: FoodNutrientInput[];
  servings?: FoodServingInput[];
}

export interface FoodCatalogUnitOfWork {
  create(input: CreateCustomFoodInput): Promise<string>;
  update(foodId: string, input: UpdateCustomFoodInput): Promise<void>;
  softDelete(foodId: string, deletedAt: Date): Promise<void>;
}

export interface FoodMutationResultReader {
  findVisibleById(actorId: string, foodId: string): Promise<FoodDetailView | null>;
}
