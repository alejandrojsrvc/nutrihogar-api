export class InvalidPurchaseError extends Error {
  constructor(message = 'Purchase is invalid.') {
    super(message);
    this.name = 'InvalidPurchaseError';
  }
}

export class InvalidPurchaseStateError extends Error {
  constructor(message = 'Purchase cannot perform this operation in its current state.') {
    super(message);
    this.name = 'InvalidPurchaseStateError';
  }
}
