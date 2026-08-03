export class PurchaseNotFoundError extends Error {
  constructor() {
    super('Purchase was not found.');
    this.name = 'PurchaseNotFoundError';
  }
}
export class PurchaseAccessDeniedError extends Error {
  constructor() {
    super('Active household access is required.');
    this.name = 'PurchaseAccessDeniedError';
  }
}
export class PurchaseAdminRequiredError extends Error {
  constructor() {
    super('An household administrator is required.');
    this.name = 'PurchaseAdminRequiredError';
  }
}
export class PurchaseFoodNotAvailableError extends Error {
  constructor() {
    super('The food is not visible in this household.');
    this.name = 'PurchaseFoodNotAvailableError';
  }
}
export class PurchaseInventorySelectionError extends Error {
  constructor() {
    super('The inventory selection is not compatible.');
    this.name = 'PurchaseInventorySelectionError';
  }
}
export class PurchaseUnitConversionError extends Error {
  constructor() {
    super('The purchase quantity unit is unknown or incompatible with the food reference unit.');
    this.name = 'PurchaseUnitConversionError';
  }
}
export class PurchaseIdempotencyConflictError extends Error {
  constructor() {
    super('The idempotency key is already used for another purchase.');
    this.name = 'PurchaseIdempotencyConflictError';
  }
}
