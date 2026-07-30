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

export class NutritionGoalProfileNotFoundError extends Error {
  constructor() {
    super('Adult profile not found.');
    this.name = NutritionGoalProfileNotFoundError.name;
  }
}

export class IncompleteNutritionGoalProfileError extends Error {
  constructor(public readonly field: 'weightKg' | 'heightCm') {
    super(`The adult profile requires a valid ${field}.`);
    this.name = IncompleteNutritionGoalProfileError.name;
  }
}

export class InvalidNutritionGoalProfileAgeError extends Error {
  constructor() {
    super('The adult profile age must be between 18 and 120 years.');
    this.name = InvalidNutritionGoalProfileAgeError.name;
  }
}
