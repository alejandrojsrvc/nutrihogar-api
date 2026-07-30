export class FoodModificationNotAllowedError extends Error {
  constructor() {
    super('Only custom household foods can be modified.');
    this.name = FoodModificationNotAllowedError.name;
  }
}

export class FoodHouseholdAccessDeniedError extends Error {
  constructor() {
    super('The user is not an active member of the household.');
    this.name = FoodHouseholdAccessDeniedError.name;
  }
}

export class InvalidFoodInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidFoodInputError.name;
  }
}
