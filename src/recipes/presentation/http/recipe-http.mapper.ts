import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FoodNotAvailableError } from '../../../nutrition/application/errors/food-not-available.error';
import {
  FoodServingNotFoundError,
  FoodUnitMismatchError,
  IncompleteServingEquivalenceError,
  InvalidFoodQuantityError,
} from '../../../nutrition/domain/errors/nutrition-engine.errors';
import {
  DuplicateRecipeIngredientError,
  InvalidRecipeIngredientError,
  InvalidRecipeInstructionError,
  InvalidRecipePositionError,
  RecipeArchivedError,
  RecipeIngredientsRequiredError,
  RecipeNameRequiredError,
} from '../../domain/errors/recipe.errors';
import {
  RecipeAccessDeniedError,
  RecipeArchiveAccessDeniedError,
  RecipeNameConflictError,
  RecipeNotFoundError,
} from '../../application/errors/recipe-application.errors';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeListResponseDto, RecipeResponseDto } from './dto/recipe-response.dto';

export function toRecipeResponse(recipe: Recipe): RecipeResponseDto {
  const props = recipe.toProps();
  return {
    id: props.id,
    householdId: props.householdId,
    createdById: props.createdById,
    name: props.name,
    description: props.description,
    category: props.category,
    defaultServings: props.defaultServings,
    estimatedPreparationMinutes: props.estimatedPreparationMinutes,
    tags: props.tags,
    status: props.status,
    ingredients: props.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: ingredient.quantity.toNumber(),
    })),
    instructions: props.instructions,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  };
}

export function toRecipeListResponse(result: {
  items: Recipe[];
  page: number;
  limit: number;
  total: number;
}): RecipeListResponseDto {
  return {
    items: result.items.map(toRecipeResponse),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

export function rethrowRecipeHttpError(error: unknown): never {
  if (
    error instanceof RecipeNameRequiredError ||
    error instanceof RecipeIngredientsRequiredError ||
    error instanceof InvalidRecipeIngredientError ||
    error instanceof InvalidRecipeInstructionError ||
    error instanceof InvalidRecipePositionError ||
    error instanceof DuplicateRecipeIngredientError ||
    error instanceof InvalidFoodQuantityError ||
    error instanceof FoodUnitMismatchError ||
    error instanceof FoodServingNotFoundError ||
    error instanceof IncompleteServingEquivalenceError
  ) {
    throw new BadRequestException(error.message);
  }
  if (error instanceof RecipeArchivedError || error instanceof RecipeNameConflictError) {
    throw new ConflictException(error.message);
  }
  if (error instanceof RecipeAccessDeniedError || error instanceof RecipeArchiveAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof RecipeNotFoundError || error instanceof FoodNotAvailableError) {
    throw new NotFoundException(error.message);
  }

  throw error;
}
