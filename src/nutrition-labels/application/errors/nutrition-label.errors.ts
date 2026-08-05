export class NutritionLabelAccessDeniedError extends Error {
  constructor() {
    super('Active household membership is required.');
  }
}
export class NutritionLabelAdminRequiredError extends Error {
  constructor() {
    super('Active household administrator access is required.');
  }
}
export class NutritionLabelFileError extends Error {}
export class NutritionLabelFileTooLargeError extends NutritionLabelFileError {
  constructor() {
    super('Nutrition label file is too large.');
  }
}
export class NutritionLabelExtractionConfigurationError extends Error {
  constructor() {
    super('Structured nutrition label extraction is not configured.');
  }
}
export class NutritionLabelExtractionProcessingError extends Error {}
export class NutritionLabelTargetFoodNotFoundError extends Error {}
export class NutritionLabelTargetFoodNotAllowedError extends Error {}
export class NutritionLabelDraftNotFoundError extends Error {}
export class NutritionLabelDraftExpiredError extends Error {}
export class NutritionLabelDraftAlreadyConfirmedError extends Error {}
export class InvalidNutritionLabelConfirmationError extends Error {}
export class NutritionLabelReferenceNotFoundError extends Error {}
