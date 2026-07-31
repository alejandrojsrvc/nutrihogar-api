import { RecipeIngredientUnit } from '../../domain/models/recipe.models';

export interface RecipeIngredientCommand {
  id?: string;
  foodId: string;
  quantity: number | string;
  unit: RecipeIngredientUnit;
  servingId?: string | null;
  position: number;
  notes?: string | null;
}

export interface RecipeInstructionCommand {
  id?: string;
  position: number;
  description: string;
}
