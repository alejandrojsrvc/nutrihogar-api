export class ServedPortionNotFoundError extends Error {
  constructor() {
    super('Served portion not found.');
    this.name = ServedPortionNotFoundError.name;
  }
}

export class ServedPortionConsumptionAccessDeniedError extends Error {
  constructor() {
    super('The served portion is not accessible to the user.');
    this.name = ServedPortionConsumptionAccessDeniedError.name;
  }
}

export class InvalidConsumptionDateError extends Error {
  constructor() {
    super('The consumption date must be valid and cannot be in the future.');
    this.name = InvalidConsumptionDateError.name;
  }
}

export class InvalidRemainderInputError extends Error {
  constructor() {
    super('The remainder weight and disposition must be provided together.');
    this.name = InvalidRemainderInputError.name;
  }
}
