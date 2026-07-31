import Decimal from 'decimal.js';
import {
  BaseFoodUnit,
  NutritionFoodData,
} from '../../../nutrition/domain/models/nutrition-engine.models';
import { RecipeIngredientUnit } from './recipe.models';

export type PreparedBatchStatus = 'DRAFT' | 'INGREDIENTS_CONFIRMED' | 'FINALIZED' | 'CANCELLED';

export interface PreparedBatchNutrientSnapshotProps {
  code: string;
  name: string;
  unit: string;
  amount: Decimal;
}

export interface PreparedBatchIngredientProps {
  id: string;
  foodId: string;
  quantity: Decimal;
  unit: RecipeIngredientUnit;
  servingId: string | null;
  position: number;
  notes: string | null;
  foodNameSnapshot: string | null;
  brandSnapshot: string | null;
  preparationStateSnapshot: NutritionFoodData['preparationState'] | null;
  confidenceLevel: NutritionFoodData['confidenceLevel'] | null;
  baseQuantity: Decimal | null;
  baseUnit: BaseFoodUnit | null;
  nutrients: PreparedBatchNutrientSnapshotProps[];
}

export interface PreparedBatchProps {
  id: string;
  householdId: string;
  recipeId: string | null;
  recipeNameSnapshot: string;
  preparedAt: Date;
  status: PreparedBatchStatus;
  ingredients: PreparedBatchIngredientProps[];
  totalNutrients: PreparedBatchNutrientSnapshotProps[];
  finalCookedWeight: Decimal | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
  cancelledAt: Date | null;
}

export interface PreparedBatchNutritionSnapshotInput {
  ingredientId: string;
  foodId: string;
  foodName: string | null;
  foodBrand: string | null;
  preparationState: NutritionFoodData['preparationState'] | null;
  confidenceLevel: NutritionFoodData['confidenceLevel'] | null;
  baseQuantity: Decimal.Value;
  baseUnit: BaseFoodUnit;
  nutrients: PreparedBatchNutrientSnapshotProps[];
}
