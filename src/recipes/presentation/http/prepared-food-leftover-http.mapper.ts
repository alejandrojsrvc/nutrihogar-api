import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import {
  InvalidPreparedFoodLeftoverWeightError,
  PreparedFoodLeftoverAlreadyClosedError,
  PreparedFoodLeftoverAvailabilityExceededError,
} from '../../domain/errors/prepared-food-leftover.errors';
import {
  InvalidStoredAtError,
  PreparedFoodLeftoverAccessDeniedError,
  PreparedFoodLeftoverNotFoundError,
} from '../../application/errors/prepared-food-leftover-application.errors';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedFoodLeftoverResponseDto } from './dto/prepared-food-leftover-response.dto';

export function toPreparedFoodLeftoverResponse(
  leftover: PreparedFoodLeftover,
): PreparedFoodLeftoverResponseDto {
  return {
    id: leftover.id,
    preparedBatchId: leftover.preparedBatchId,
    householdId: leftover.householdId,
    availableWeight: leftover.availableWeight.toDecimalPlaces(2).toNumber(),
    nutrientDensitySnapshot: Object.fromEntries(
      leftover.nutrientDensitySnapshot.map((nutrient) => [
        nutrient.code,
        nutrient.amountPerGram.toDecimalPlaces(6).toNumber(),
      ]),
    ),
    storedAt: leftover.storedAt,
    storageLocation: leftover.storageLocation,
    notes: leftover.notes,
    status: leftover.status,
    createdAt: leftover.createdAt,
    updatedAt: leftover.updatedAt,
  };
}

export function rethrowPreparedFoodLeftoverHttpError(error: unknown): never {
  if (
    error instanceof InvalidPreparedFoodLeftoverWeightError ||
    error instanceof InvalidStoredAtError
  ) {
    throw new BadRequestException(error.message);
  }
  if (
    error instanceof PreparedBatchNotFinalizedError ||
    error instanceof PreparedFoodLeftoverAvailabilityExceededError ||
    error instanceof PreparedFoodLeftoverAlreadyClosedError
  ) {
    throw new ConflictException(error.message);
  }
  if (error instanceof PreparedFoodLeftoverAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof PreparedFoodLeftoverNotFoundError) {
    throw new NotFoundException(error.message);
  }
  throw error;
}
