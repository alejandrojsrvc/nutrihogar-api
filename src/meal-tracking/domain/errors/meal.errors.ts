export class EmptyMealError extends Error {
  constructor() {
    super('A meal must contain at least one item.');
    this.name = EmptyMealError.name;
  }
}

export class InvalidMealDateError extends Error {
  constructor() {
    super('The meal date cannot be in the future.');
    this.name = InvalidMealDateError.name;
  }
}

export class MealAlreadyCancelledError extends Error {
  constructor() {
    super('The meal has already been cancelled.');
    this.name = MealAlreadyCancelledError.name;
  }
}

export class CancelledMealEditError extends Error {
  constructor() {
    super('A cancelled meal cannot be edited.');
    this.name = CancelledMealEditError.name;
  }
}
