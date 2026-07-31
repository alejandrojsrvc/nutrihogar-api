export class RecipeAccessDeniedError extends Error {
  constructor() {
    super('The household is not accessible to the user.');
    this.name = RecipeAccessDeniedError.name;
  }
}

export class RecipeArchiveAccessDeniedError extends Error {
  constructor() {
    super('Only household administrators can archive recipes.');
    this.name = RecipeArchiveAccessDeniedError.name;
  }
}

export class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found.');
    this.name = RecipeNotFoundError.name;
  }
}

export class RecipeNameConflictError extends Error {
  constructor() {
    super('A recipe with this name already exists in the household.');
    this.name = RecipeNameConflictError.name;
  }
}
