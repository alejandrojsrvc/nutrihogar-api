export class InvalidFoodQuantityError extends Error {
  constructor() {
    super('Food quantity must be greater than zero.');
    this.name = InvalidFoodQuantityError.name;
  }
}

export class FoodUnitMismatchError extends Error {
  constructor() {
    super('The selected unit does not match the food reference unit.');
    this.name = FoodUnitMismatchError.name;
  }
}

export class FoodServingNotFoundError extends Error {
  constructor() {
    super('The selected serving does not exist for the food.');
    this.name = FoodServingNotFoundError.name;
  }
}

export class IncompleteServingEquivalenceError extends Error {
  constructor() {
    super('The selected serving has no valid equivalence for the food reference unit.');
    this.name = IncompleteServingEquivalenceError.name;
  }
}

export class InvalidFoodReferenceError extends Error {
  constructor() {
    super('The food reference quantity must be greater than zero.');
    this.name = InvalidFoodReferenceError.name;
  }
}
