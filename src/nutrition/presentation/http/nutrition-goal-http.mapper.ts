import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  IncompleteNutritionGoalProfileError,
  InvalidNutritionGoalProfileAgeError,
  NutritionGoalAccessDeniedError,
  NutritionGoalProfileNotFoundError,
} from '../../application/errors/nutrition-goal.errors';

export function rethrowNutritionGoalHttpError(error: unknown): never {
  if (
    error instanceof IncompleteNutritionGoalProfileError ||
    error instanceof InvalidNutritionGoalProfileAgeError
  ) {
    throw new BadRequestException(error.message);
  }
  if (error instanceof NutritionGoalAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof NutritionGoalProfileNotFoundError) {
    throw new NotFoundException(error.message);
  }

  throw error;
}
