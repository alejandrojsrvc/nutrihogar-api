export class NutritionGoalReviewNotFoundError extends Error {
  constructor() {
    super('Nutrition goal review not found.');
    this.name = NutritionGoalReviewNotFoundError.name;
  }
}

export class NutritionGoalReviewAlreadyHandledError extends Error {
  constructor() {
    super('Nutrition goal review has already been handled.');
    this.name = NutritionGoalReviewAlreadyHandledError.name;
  }
}

export class NutritionGoalReviewProposalRequiredError extends Error {
  constructor() {
    super('A generated nutrition goal review proposal must be accepted explicitly.');
    this.name = NutritionGoalReviewProposalRequiredError.name;
  }
}

export class NutritionGoalReviewPostponedError extends Error {
  constructor() {
    super('Nutrition goal review is postponed.');
    this.name = NutritionGoalReviewPostponedError.name;
  }
}

export class NutritionGoalReviewNoCurrentGoalError extends Error {
  constructor() {
    super('A current nutrition goal is required to review it.');
    this.name = NutritionGoalReviewNoCurrentGoalError.name;
  }
}
