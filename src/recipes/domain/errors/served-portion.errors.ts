export class InvalidServedWeightError extends Error {
  constructor() {
    super('The served weight must be greater than zero.');
    this.name = InvalidServedWeightError.name;
  }
}

export class InvalidRemainderWeightError extends Error {
  constructor() {
    super('The remainder weight cannot be negative.');
    this.name = InvalidRemainderWeightError.name;
  }
}

export class RemainderExceedsServedWeightError extends Error {
  constructor() {
    super('The remainder weight cannot exceed the served weight.');
    this.name = RemainderExceedsServedWeightError.name;
  }
}

export class RemainderAlreadyRecordedError extends Error {
  constructor() {
    super('A remainder has already been recorded for this portion.');
    this.name = RemainderAlreadyRecordedError.name;
  }
}

export class ServedPortionAlreadyConsumedError extends Error {
  constructor() {
    super('The served portion consumption has already been confirmed.');
    this.name = ServedPortionAlreadyConsumedError.name;
  }
}

export class ServedPortionCancelledError extends Error {
  constructor() {
    super('The served portion has been cancelled.');
    this.name = ServedPortionCancelledError.name;
  }
}

export class ServedPortionNotServedError extends Error {
  constructor() {
    super('The served portion is not available for this operation.');
    this.name = ServedPortionNotServedError.name;
  }
}

export class PortionAvailabilityExceededError extends Error {
  constructor() {
    super('The requested portions exceed the prepared batch availability.');
    this.name = PortionAvailabilityExceededError.name;
  }
}

export class ServedPortionsRequiredError extends Error {
  constructor() {
    super('At least one served portion is required.');
    this.name = ServedPortionsRequiredError.name;
  }
}

export class InvalidServedAtError extends Error {
  constructor() {
    super('The served date must be valid and cannot be in the future.');
    this.name = InvalidServedAtError.name;
  }
}
