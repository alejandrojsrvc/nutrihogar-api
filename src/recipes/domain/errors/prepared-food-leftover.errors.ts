export class InvalidPreparedFoodLeftoverWeightError extends Error {
  constructor() {
    super('The prepared food leftover weight must be greater than zero.');
    this.name = InvalidPreparedFoodLeftoverWeightError.name;
  }
}

export class PreparedFoodLeftoverAlreadyClosedError extends Error {
  constructor() {
    super('The prepared food leftover status can no longer be changed.');
    this.name = PreparedFoodLeftoverAlreadyClosedError.name;
  }
}

export class PreparedFoodLeftoverAvailabilityExceededError extends Error {
  constructor() {
    super('The prepared food leftover exceeds the available batch weight.');
    this.name = PreparedFoodLeftoverAvailabilityExceededError.name;
  }
}
