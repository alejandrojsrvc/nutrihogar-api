import Decimal from 'decimal.js';
import {
  DuplicateRecipeIngredientError,
  InvalidRecipeIngredientError,
  InvalidRecipeInstructionError,
  InvalidRecipePositionError,
  RecipeArchivedError,
  RecipeIngredientsRequiredError,
  RecipeNameRequiredError,
} from '../errors/recipe.errors';
import {
  RecipeIngredientProps,
  RecipeInstructionProps,
  RecipeProps,
  RecipeStatus,
} from '../models/recipe.models';

export class Recipe {
  private constructor(private readonly props: RecipeProps) {}

  static create(
    input: Omit<RecipeProps, 'status' | 'deletedAt'> & { status?: RecipeStatus },
  ): Recipe {
    const name = requiredName(input.name);
    const ingredients = normalizeIngredients(input.ingredients);
    if (ingredients.length === 0) throw new RecipeIngredientsRequiredError();

    return new Recipe({
      ...input,
      name,
      description: normalizeOptionalText(input.description),
      category: normalizeOptionalText(input.category),
      defaultServings: positiveInteger(input.defaultServings),
      estimatedPreparationMinutes:
        input.estimatedPreparationMinutes === null
          ? null
          : positiveInteger(input.estimatedPreparationMinutes),
      ingredients,
      instructions: normalizeInstructions(input.instructions),
      tags: normalizeTags(input.tags),
      status: input.status ?? 'ACTIVE',
      deletedAt: null,
    });
  }

  static reconstitute(props: RecipeProps): Recipe {
    const recipe = Recipe.create(props);
    recipe.props.deletedAt = props.deletedAt;
    return recipe;
  }

  get id(): string {
    return this.props.id;
  }

  get householdId(): string {
    return this.props.householdId;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get category(): string | null {
    return this.props.category;
  }

  get defaultServings(): number {
    return this.props.defaultServings;
  }

  get estimatedPreparationMinutes(): number | null {
    return this.props.estimatedPreparationMinutes;
  }

  get status(): RecipeStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get ingredients(): RecipeIngredientProps[] {
    return this.props.ingredients.map(copyIngredient);
  }

  get instructions(): RecipeInstructionProps[] {
    return this.props.instructions.map((instruction) => ({ ...instruction }));
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  rename(name: string): void {
    this.ensureActive();
    this.props.name = requiredName(name);
    this.touch();
  }

  changeDescription(description: string | null): void {
    this.ensureActive();
    this.props.description = normalizeOptionalText(description);
    this.touch();
  }

  changeDetails(input: {
    category?: string | null;
    defaultServings?: number;
    estimatedPreparationMinutes?: number | null;
    tags?: string[];
  }): void {
    this.ensureActive();
    if (input.category !== undefined) this.props.category = normalizeOptionalText(input.category);
    if (input.defaultServings !== undefined)
      this.props.defaultServings = positiveInteger(input.defaultServings);
    if (input.estimatedPreparationMinutes !== undefined) {
      this.props.estimatedPreparationMinutes =
        input.estimatedPreparationMinutes === null
          ? null
          : positiveInteger(input.estimatedPreparationMinutes);
    }
    if (input.tags !== undefined) this.props.tags = normalizeTags(input.tags);
    this.touch();
  }

  replaceIngredients(ingredients: RecipeIngredientProps[]): void {
    this.ensureActive();
    const normalized = normalizeIngredients(ingredients);
    if (normalized.length === 0) throw new RecipeIngredientsRequiredError();
    this.props.ingredients = normalized;
    this.touch();
  }

  replaceInstructions(instructions: RecipeInstructionProps[]): void {
    this.ensureActive();
    this.props.instructions = normalizeInstructions(instructions);
    this.touch();
  }

  addIngredient(input: Omit<RecipeIngredientProps, 'id'> & { id?: string }): void {
    this.ensureActive();
    const ingredient = validateIngredient({ ...input, id: input.id ?? crypto.randomUUID() });
    this.ensureIngredientIsUnique(ingredient, null);
    this.props.ingredients.push(ingredient);
    this.props.ingredients = normalizeIngredients(this.props.ingredients);
    this.touch();
  }

  updateIngredient(ingredientId: string, input: Omit<RecipeIngredientProps, 'id'>): void {
    this.ensureActive();
    const index = this.props.ingredients.findIndex((ingredient) => ingredient.id === ingredientId);
    if (index < 0) throw new InvalidRecipeIngredientError();
    const ingredient = validateIngredient({ ...input, id: ingredientId });
    this.ensureIngredientIsUnique(ingredient, ingredientId);
    this.props.ingredients[index] = ingredient;
    this.props.ingredients = normalizeIngredients(this.props.ingredients);
    this.touch();
  }

  removeIngredient(ingredientId: string): void {
    this.ensureActive();
    const ingredients = this.props.ingredients.filter(
      (ingredient) => ingredient.id !== ingredientId,
    );
    if (ingredients.length === this.props.ingredients.length)
      throw new InvalidRecipeIngredientError();
    if (ingredients.length === 0) throw new RecipeIngredientsRequiredError();
    this.props.ingredients = normalizeIngredients(ingredients);
    this.touch();
  }

  reorderIngredients(ingredientIds: string[]): void {
    this.ensureActive();
    if (
      !sameIds(
        ingredientIds,
        this.props.ingredients.map((ingredient) => ingredient.id),
      )
    ) {
      throw new InvalidRecipePositionError();
    }
    const byId = new Map(this.props.ingredients.map((ingredient) => [ingredient.id, ingredient]));
    this.props.ingredients = ingredientIds.map((id, index) => ({
      ...byId.get(id)!,
      position: index + 1,
    }));
    this.touch();
  }

  addInstruction(input: Omit<RecipeInstructionProps, 'id'> & { id?: string }): void {
    this.ensureActive();
    this.props.instructions.push(
      validateInstruction({ ...input, id: input.id ?? crypto.randomUUID() }),
    );
    this.props.instructions = normalizeInstructions(this.props.instructions);
    this.touch();
  }

  updateInstruction(instructionId: string, input: Omit<RecipeInstructionProps, 'id'>): void {
    this.ensureActive();
    const index = this.props.instructions.findIndex(
      (instruction) => instruction.id === instructionId,
    );
    if (index < 0) throw new InvalidRecipeInstructionError();
    this.props.instructions[index] = validateInstruction({ ...input, id: instructionId });
    this.props.instructions = normalizeInstructions(this.props.instructions);
    this.touch();
  }

  removeInstruction(instructionId: string): void {
    this.ensureActive();
    const instructions = this.props.instructions.filter(
      (instruction) => instruction.id !== instructionId,
    );
    if (instructions.length === this.props.instructions.length) {
      throw new InvalidRecipeInstructionError();
    }
    this.props.instructions = normalizeInstructions(instructions);
    this.touch();
  }

  archive(): void {
    this.ensureActive();
    this.props.status = 'ARCHIVED';
    this.props.deletedAt = new Date();
    this.touch();
  }

  toProps(): RecipeProps {
    return {
      ...this.props,
      ingredients: this.ingredients,
      instructions: this.instructions,
      tags: this.tags,
    };
  }

  private ensureActive(): void {
    if (this.props.status === 'ARCHIVED') throw new RecipeArchivedError();
  }

  private ensureIngredientIsUnique(
    ingredient: RecipeIngredientProps,
    exceptId: string | null,
  ): void {
    const duplicate = this.props.ingredients.some(
      (candidate) => candidate.id !== exceptId && sameIngredient(candidate, ingredient),
    );
    if (duplicate) throw new DuplicateRecipeIngredientError();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) throw new RecipeNameRequiredError();
  return name;
}

function normalizeOptionalText(value: string | null): string | null {
  if (value === null) return null;
  const text = value.trim();
  return text || null;
}

function positiveInteger(value: number | null): number {
  if (value === null) throw new InvalidRecipeIngredientError();
  if (!Number.isInteger(value) || value <= 0) throw new InvalidRecipeIngredientError();
  return value;
}

function validateIngredient(input: RecipeIngredientProps): RecipeIngredientProps {
  if (!input.foodId || !input.unit || input.position <= 0 || !Number.isInteger(input.position)) {
    throw new InvalidRecipeIngredientError();
  }
  if (input.unit === 'SERVING' && !input.servingId) throw new InvalidRecipeIngredientError();
  if (input.unit !== 'SERVING' && input.servingId) throw new InvalidRecipeIngredientError();

  const quantity = new Decimal(input.quantity);
  if (!quantity.isFinite() || quantity.lte(0)) throw new InvalidRecipeIngredientError();

  return {
    ...input,
    quantity,
    notes: normalizeOptionalText(input.notes),
  };
}

function normalizeIngredients(ingredients: RecipeIngredientProps[]): RecipeIngredientProps[] {
  const normalized = ingredients
    .map(validateIngredient)
    .sort((left, right) => left.position - right.position);
  const positions = new Set<number>();
  for (const ingredient of normalized) {
    if (positions.has(ingredient.position)) throw new InvalidRecipePositionError();
    positions.add(ingredient.position);
  }
  ensureUniqueIngredients(normalized);
  return normalized.map((ingredient, index) => ({ ...ingredient, position: index + 1 }));
}

function normalizeInstructions(instructions: RecipeInstructionProps[]): RecipeInstructionProps[] {
  const normalized = instructions
    .map(validateInstruction)
    .sort((left, right) => left.position - right.position);
  const positions = new Set<number>();
  for (const instruction of normalized) {
    if (positions.has(instruction.position)) throw new InvalidRecipePositionError();
    positions.add(instruction.position);
  }
  return normalized.map((instruction, index) => ({ ...instruction, position: index + 1 }));
}

function validateInstruction(input: RecipeInstructionProps): RecipeInstructionProps {
  if (
    !input.id ||
    !Number.isInteger(input.position) ||
    input.position <= 0 ||
    !input.description.trim()
  ) {
    throw new InvalidRecipeInstructionError();
  }
  return { ...input, description: input.description.trim() };
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function ensureUniqueIngredients(ingredients: RecipeIngredientProps[]): void {
  const keys = new Set<string>();
  for (const ingredient of ingredients) {
    const key = ingredientKey(ingredient);
    if (keys.has(key)) throw new DuplicateRecipeIngredientError();
    keys.add(key);
  }
}

function sameIngredient(left: RecipeIngredientProps, right: RecipeIngredientProps): boolean {
  return ingredientKey(left) === ingredientKey(right);
}

function ingredientKey(ingredient: RecipeIngredientProps): string {
  return `${ingredient.foodId}|${ingredient.unit}|${ingredient.servingId ?? ''}`;
}

function sameIds(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((id) => right.includes(id))
  );
}

function copyIngredient(ingredient: RecipeIngredientProps): RecipeIngredientProps {
  return { ...ingredient, quantity: new Decimal(ingredient.quantity) };
}
