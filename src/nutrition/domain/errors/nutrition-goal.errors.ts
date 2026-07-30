export class InvalidNutritionGoalValuesError extends Error {
  constructor() {
    super('Nutrition goal values must be finite and greater than zero.');
    this.name = InvalidNutritionGoalValuesError.name;
  }
}

export class InvalidNutritionGoalExpirationError extends Error {
  constructor() {
    super('Nutrition goal suggestion expiration must be in the future.');
    this.name = InvalidNutritionGoalExpirationError.name;
  }
}

export class InvalidNutritionGoalMetadataError extends Error {
  constructor() {
    super('Nutrition goal calculation method and goal type are required.');
    this.name = InvalidNutritionGoalMetadataError.name;
  }
}
