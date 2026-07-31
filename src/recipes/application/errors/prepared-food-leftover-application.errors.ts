export class PreparedFoodLeftoverNotFoundError extends Error {
  constructor() {
    super('Prepared food leftover not found.');
    this.name = PreparedFoodLeftoverNotFoundError.name;
  }
}

export class PreparedFoodLeftoverAccessDeniedError extends Error {
  constructor() {
    super('The prepared food leftover is not accessible to the user.');
    this.name = PreparedFoodLeftoverAccessDeniedError.name;
  }
}

export class InvalidStoredAtError extends Error {
  constructor() {
    super('The storage date must be valid and cannot be in the future.');
    this.name = InvalidStoredAtError.name;
  }
}
