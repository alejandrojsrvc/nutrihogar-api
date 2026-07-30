import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  FoodHouseholdAccessDeniedError,
  FoodModificationNotAllowedError,
  InvalidFoodInputError,
} from '../../application/errors/food-catalog-mutation.errors';
import { FoodNotFoundError } from '../../application/errors/food-not-found.error';

export function rethrowFoodCatalogHttpError(error: unknown): never {
  if (error instanceof InvalidFoodInputError) {
    throw new BadRequestException(error.message);
  }
  if (
    error instanceof FoodHouseholdAccessDeniedError ||
    error instanceof FoodModificationNotAllowedError
  ) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof FoodNotFoundError) {
    throw new NotFoundException('Food not found.');
  }
  throw error;
}
