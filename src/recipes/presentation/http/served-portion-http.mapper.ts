import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdultProfileNotFoundError } from '../../../households/application/adult-profile-errors/adult-profile.errors';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import {
  InvalidRemainderWeightError,
  InvalidServedAtError,
  InvalidServedWeightError,
  PortionAvailabilityExceededError,
  ServedPortionAlreadyConsumedError,
  ServedPortionCancelledError,
  ServedPortionsRequiredError,
} from '../../domain/errors/served-portion.errors';
import {
  PreparedBatchAccessDeniedError,
  PreparedBatchNotFoundError,
} from '../../application/errors/prepared-batch-application.errors';
import { ServePreparedBatchPortionsResult } from '../../application/models/served-portion-command.models';
import { ServePreparedBatchPortionsResponseDto } from './dto/served-portion-response.dto';

export function toServedPortionsResponse(
  result: ServePreparedBatchPortionsResult,
): ServePreparedBatchPortionsResponseDto {
  return {
    preparedBatchId: result.preparedBatchId,
    portions: result.portions.map((portion) => ({
      id: portion.id,
      adultProfileId: portion.adultProfileId,
      servedWeight: portion.servedWeight.toDecimalPlaces(2).toNumber(),
      estimatedNutrition: Object.fromEntries(
        Object.entries(portion.estimatedNutrition).map(([code, amount]) => [
          code,
          amount.toDecimalPlaces(4).toNumber(),
        ]),
      ),
    })),
    availableWeight: result.availableWeight.toDecimalPlaces(2).toNumber(),
  };
}

export function rethrowServedPortionHttpError(error: unknown): never {
  if (
    error instanceof InvalidServedWeightError ||
    error instanceof InvalidRemainderWeightError ||
    error instanceof InvalidServedAtError ||
    error instanceof ServedPortionsRequiredError
  ) {
    throw new BadRequestException(error.message);
  }
  if (
    error instanceof PreparedBatchNotFinalizedError ||
    error instanceof PortionAvailabilityExceededError ||
    error instanceof ServedPortionAlreadyConsumedError ||
    error instanceof ServedPortionCancelledError
  ) {
    throw new ConflictException(error.message);
  }
  if (error instanceof PreparedBatchAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof PreparedBatchNotFoundError || error instanceof AdultProfileNotFoundError) {
    throw new NotFoundException(error.message);
  }

  throw error;
}
