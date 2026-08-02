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
import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import {
  DuplicateCustomMeasurementError,
  CustomMeasurementNotFoundError,
  InvalidHealthTrackingValueError,
} from '../../domain/errors/health-tracking.errors';
import {
  DigestiveSymptomAccessDeniedError,
  DigestiveSymptomCorrectionDeniedError,
  DigestiveSymptomEntryNotFoundError,
  DigestiveSymptomFoodNotAvailableError,
  DigestiveSymptomFoodNotInMealError,
  DigestiveSymptomMealNotFoundError,
} from '../../application/errors/digestive-symptom-application.errors';

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
export const DIGESTIVE_SYMPTOM_DISCLAIMER =
  'Los alimentos y comidas relacionados son hipótesis de registro y no demuestran causalidad médica.';
export function toDigestiveSymptomResponse(entry: DigestiveSymptomEntry) {
  const props = entry.toProps();
  return {
    ...props,
    startAt: props.startAt.toISOString(),
    endAt: props.endAt?.toISOString() ?? null,
    mealIds: props.mealLinks.map((link) => link.mealId),
    disclaimer: DIGESTIVE_SYMPTOM_DISCLAIMER,
  };
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
  if (
    error instanceof DigestiveSymptomEntryNotFoundError ||
    error instanceof DigestiveSymptomMealNotFoundError
  )
    throw new NotFoundException(error.message);
  if (
    error instanceof DigestiveSymptomAccessDeniedError ||
    error instanceof DigestiveSymptomCorrectionDeniedError
  )
    throw new ForbiddenException(error.message);
  if (
    error instanceof DigestiveSymptomFoodNotAvailableError ||
    error instanceof DigestiveSymptomFoodNotInMealError
  )
    throw new BadRequestException(error.message);
  throw error;
}

export function toBodyProgressResponse(result: unknown) {
  return result;
}
export function toDigestiveSymptomInsightsResponse(result: unknown) {
  return result;
}
