import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  HealthTrackingAccessDeniedError,
  HealthTrackingCorrectionDeniedError,
  HealthTrackingEntryNotFoundError,
  HealthTrackingProfileNotFoundError,
  MeasurementNotEnabledError,
} from '../../application/errors/health-tracking-application.errors';
import { HealthTrackingResponseDto } from './dto/health-tracking.dto';
import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import {
  DuplicateCustomMeasurementError,
  CustomMeasurementNotFoundError,
  InvalidHealthTrackingValueError,
} from '../../domain/errors/health-tracking.errors';

export function toHealthResponse(
  entry: BodyWeightEntry | BodyMeasurementEntry,
): HealthTrackingResponseDto {
  const props = entry.toProps();
  return {
    id: props.id,
    adultProfileId: props.adultProfileId,
    value: props.value.toString(),
    unit: props.unit,
    recordedAt: props.recordedAt.toISOString(),
    source: props.source,
    correctedFromId: props.correctedFromId,
  };
}
export function toConfigurationResponse(configuration: MeasurementConfiguration) {
  return configuration.toProps();
}
export function rethrowHealthTrackingHttpError(error: unknown): never {
  if (
    error instanceof HealthTrackingEntryNotFoundError ||
    error instanceof HealthTrackingProfileNotFoundError
  )
    throw new NotFoundException(error.message);
  if (
    error instanceof HealthTrackingAccessDeniedError ||
    error instanceof HealthTrackingCorrectionDeniedError
  )
    throw new ForbiddenException(error.message);
  if (
    error instanceof MeasurementNotEnabledError ||
    error instanceof InvalidHealthTrackingValueError ||
    error instanceof DuplicateCustomMeasurementError ||
    error instanceof CustomMeasurementNotFoundError
  )
    throw new BadRequestException(error.message);
  throw error;
}
