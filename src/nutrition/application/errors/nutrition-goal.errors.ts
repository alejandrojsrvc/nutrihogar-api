export class NutritionGoalAccessDeniedError extends Error {
  constructor() {
    super('The adult profile is not accessible to the user.');
    this.name = NutritionGoalAccessDeniedError.name;
  }
}

export class NutritionGoalSuggestionNotFoundError extends Error {
  constructor() {
    super('Nutrition goal suggestion not found.');
    this.name = NutritionGoalSuggestionNotFoundError.name;
  }
}

export class NutritionGoalSuggestionExpiredError extends Error {
  constructor() {
    super('Nutrition goal suggestion has expired.');
    this.name = NutritionGoalSuggestionExpiredError.name;
  }
}

export class NutritionGoalSuggestionAlreadyHandledError extends Error {
  constructor() {
    super('Nutrition goal suggestion has already been handled.');
    this.name = NutritionGoalSuggestionAlreadyHandledError.name;
  }
}
