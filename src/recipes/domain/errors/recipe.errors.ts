export class RecipeNameRequiredError extends Error {
  constructor() {
    super('Recipe name is required.');
    this.name = RecipeNameRequiredError.name;
  }
}

export class RecipeIngredientsRequiredError extends Error {
  constructor() {
    super('A recipe must contain at least one ingredient.');
    this.name = RecipeIngredientsRequiredError.name;
  }
}

export class InvalidRecipeIngredientError extends Error {
  constructor() {
    super('Recipe ingredient data is invalid.');
    this.name = InvalidRecipeIngredientError.name;
  }
}

export class DuplicateRecipeIngredientError extends Error {
  constructor() {
    super('The recipe cannot contain the same food, unit and serving more than once.');
    this.name = DuplicateRecipeIngredientError.name;
  }
}

export class InvalidRecipePositionError extends Error {
  constructor() {
    super('Recipe positions must be positive and unique.');
    this.name = InvalidRecipePositionError.name;
  }
}

export class RecipeArchivedError extends Error {
  constructor() {
    super('An archived recipe cannot be modified.');
    this.name = RecipeArchivedError.name;
  }
}

export class InvalidRecipeInstructionError extends Error {
  constructor() {
    super('Recipe instruction data is invalid.');
    this.name = InvalidRecipeInstructionError.name;
  }
}
