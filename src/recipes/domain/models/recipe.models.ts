import Decimal from 'decimal.js';

export type RecipeStatus = 'ACTIVE' | 'ARCHIVED';
export type RecipeIngredientUnit = 'GRAM' | 'MILLILITER' | 'UNIT' | 'SERVING';

export interface RecipeIngredientProps {
  id: string;
  foodId: string;
  quantity: Decimal;
  unit: RecipeIngredientUnit;
  servingId: string | null;
  position: number;
  notes: string | null;
}

export interface RecipeInstructionProps {
  id: string;
  position: number;
  description: string;
}

export interface RecipeProps {
  id: string;
  householdId: string | null;
  createdById: string | null;
  name: string;
  description: string | null;
  category: string | null;
  defaultServings: number;
  estimatedPreparationMinutes: number | null;
  ingredients: RecipeIngredientProps[];
  instructions: RecipeInstructionProps[];
  tags: string[];
  status: RecipeStatus;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
