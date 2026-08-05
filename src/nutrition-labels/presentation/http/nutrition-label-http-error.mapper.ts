import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InvalidNutritionLabelConfirmationError,
  NutritionLabelAccessDeniedError,
  NutritionLabelAdminRequiredError,
  NutritionLabelDraftAlreadyConfirmedError,
  NutritionLabelDraftExpiredError,
  NutritionLabelDraftNotFoundError,
  NutritionLabelFileError,
  NutritionLabelFileTooLargeError,
  NutritionLabelExtractionConfigurationError,
  NutritionLabelExtractionProcessingError,
  NutritionLabelTargetFoodNotAllowedError,
  NutritionLabelTargetFoodNotFoundError,
  NutritionLabelReferenceNotFoundError,
} from '../../application/errors/nutrition-label.errors';

export function rethrowNutritionLabelHttpError(error: unknown): never {
  if (
    error instanceof NutritionLabelAccessDeniedError ||
    error instanceof NutritionLabelAdminRequiredError
  )
    throw new ForbiddenException(error.message);
  if (error instanceof NutritionLabelFileTooLargeError)
    throw new PayloadTooLargeException(error.message);
  if (error instanceof NutritionLabelFileError) throw new BadRequestException(error.message);
  if (error instanceof NutritionLabelExtractionConfigurationError)
    throw new ServiceUnavailableException(error.message);
  if (error instanceof NutritionLabelExtractionProcessingError)
    throw new BadGatewayException(error.message);
  if (error instanceof NutritionLabelDraftNotFoundError)
    throw new NotFoundException('Nutrition label draft not found.');
  if (error instanceof NutritionLabelDraftExpiredError)
    throw new GoneException('Nutrition label draft expired.');
  if (error instanceof NutritionLabelDraftAlreadyConfirmedError)
    throw new ConflictException('Nutrition label draft was already confirmed.');
  if (error instanceof NutritionLabelTargetFoodNotFoundError)
    throw new NotFoundException('Target food not found.');
  if (error instanceof NutritionLabelTargetFoodNotAllowedError)
    throw new ForbiddenException('Target food cannot be modified.');
  if (
    error instanceof InvalidNutritionLabelConfirmationError ||
    error instanceof NutritionLabelReferenceNotFoundError
  )
    throw new UnprocessableEntityException(error.message);
  throw error;
}
