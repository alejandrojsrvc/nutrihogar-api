import { RecipeIngredientUnit } from '../../domain/models/recipe.models';

export interface PreparedBatchIngredientCommand {
  id?: string;
  foodId: string;
  quantity: number | string;
  unit: RecipeIngredientUnit;
  servingId?: string | null;
  position: number;
  notes?: string | null;
}

export interface StartPreparedBatchCommand {
  actorId: string;
  recipeId: string;
  preparedAt?: Date;
}

export interface UpdatePreparedBatchIngredientsCommand {
  actorId: string;
  batchId: string;
  ingredients: PreparedBatchIngredientCommand[];
}

export interface PreparedBatchActorCommand {
  actorId: string;
  batchId: string;
}
