export class MealAccessDeniedError extends Error {
  constructor() {
    super('The household is not accessible to the user.');
    this.name = MealAccessDeniedError.name;
  }
}

export class MealProfileNotFoundError extends Error {
  constructor() {
    super('The adult profile does not belong to the household.');
    this.name = MealProfileNotFoundError.name;
  }
}

export class MealNotFoundError extends Error {
  constructor() {
    super('Meal not found.');
    this.name = MealNotFoundError.name;
  }
}

export class MealAdministrativeAccessDeniedError extends Error {
  constructor() {
    super('Only household administrators can include cancelled meals.');
    this.name = MealAdministrativeAccessDeniedError.name;
  }
}

export class InvalidMealDateRangeError extends Error {
  constructor() {
    super('The meal date range is invalid.');
    this.name = InvalidMealDateRangeError.name;
  }
}
