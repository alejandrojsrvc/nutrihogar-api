import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidNutritionGoalMetadataError,
  InvalidNutritionGoalValuesError,
} from '../../domain/errors/nutrition-goal.errors';
import {
  NutritionGoalAccessDeniedError,
  IncompleteNutritionGoalProfileError,
  InvalidNutritionGoalProfileAgeError,
  NutritionGoalProfileNotFoundError,
  NutritionGoalSuggestionAlreadyHandledError,
  NutritionGoalSuggestionExpiredError,
  NutritionGoalSuggestionNotFoundError,
} from '../../application/errors/nutrition-goal.errors';
import {
  NutritionGoalReviewAlreadyHandledError,
  NutritionGoalReviewNoCurrentGoalError,
  NutritionGoalReviewNotFoundError,
  NutritionGoalReviewPostponedError,
  NutritionGoalReviewProposalRequiredError,
} from '../../application/errors/nutrition-goal-review.errors';

export function rethrowNutritionGoalHttpError(error: unknown): never {
  if (
    error instanceof IncompleteNutritionGoalProfileError ||
    error instanceof InvalidNutritionGoalProfileAgeError ||
    error instanceof InvalidNutritionGoalMetadataError ||
    error instanceof InvalidNutritionGoalValuesError
  ) {
    throw new BadRequestException(error.message);
  }
  if (error instanceof NutritionGoalAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof NutritionGoalProfileNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof NutritionGoalSuggestionAlreadyHandledError ||
    error instanceof NutritionGoalSuggestionExpiredError
  ) {
    throw new ConflictException(error.message);
  }
  if (error instanceof NutritionGoalSuggestionNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof NutritionGoalReviewNoCurrentGoalError ||
    error instanceof NutritionGoalReviewNotFoundError
  )
    throw new NotFoundException(error.message);
  if (
    error instanceof NutritionGoalReviewAlreadyHandledError ||
    error instanceof NutritionGoalReviewPostponedError ||
    error instanceof NutritionGoalReviewProposalRequiredError
  )
    throw new ConflictException(error.message);

  throw error;
}
