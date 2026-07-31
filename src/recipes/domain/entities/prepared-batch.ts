import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import {
  InvalidPreparedBatchCookedWeightError,
  InvalidPreparedBatchIngredientError,
  PreparedBatchAlreadyFinalizedError,
  PreparedBatchCancelledError,
  PreparedBatchIngredientsRequiredError,
  PreparedBatchNotConfirmableError,
  PreparedBatchNotDraftError,
  PreparedBatchSnapshotMismatchError,
} from '../errors/prepared-batch.errors';
import {
  PreparedBatchIngredientProps,
  PreparedBatchNutritionSnapshotInput,
  PreparedBatchNutrientSnapshotProps,
  PreparedBatchProps,
  PreparedBatchStatus,
} from '../models/prepared-batch.models';

export class PreparedBatch {
  private constructor(private readonly props: PreparedBatchProps) {}

  static start(
    input: Omit<
      PreparedBatchProps,
      'status' | 'totalNutrients' | 'finalCookedWeight' | 'finalizedAt' | 'cancelledAt'
    >,
  ): PreparedBatch {
    const ingredients = normalizeIngredients(input.ingredients);
    if (ingredients.length === 0) throw new PreparedBatchIngredientsRequiredError();

    return new PreparedBatch({
      ...input,
      status: 'DRAFT',
      ingredients,
      totalNutrients: [],
      finalCookedWeight: null,
      finalizedAt: null,
      cancelledAt: null,
    });
  }

  static reconstitute(props: PreparedBatchProps): PreparedBatch {
    const ingredients = normalizeIngredients(props.ingredients);
    if (ingredients.length === 0) throw new PreparedBatchIngredientsRequiredError();

    return new PreparedBatch({
      ...props,
      ingredients,
      totalNutrients: copyNutrients(props.totalNutrients),
      finalCookedWeight: copyDecimal(props.finalCookedWeight),
      preparedAt: new Date(props.preparedAt),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      finalizedAt: props.finalizedAt ? new Date(props.finalizedAt) : null,
      cancelledAt: props.cancelledAt ? new Date(props.cancelledAt) : null,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get householdId(): string {
    return this.props.householdId;
  }

  get recipeId(): string | null {
    return this.props.recipeId;
  }

  get recipeNameSnapshot(): string {
    return this.props.recipeNameSnapshot;
  }

  get preparedAt(): Date {
    return new Date(this.props.preparedAt);
  }

  get status(): PreparedBatchStatus {
    return this.props.status;
  }

  get ingredients(): PreparedBatchIngredientProps[] {
    return this.props.ingredients.map(copyIngredient);
  }

  get finalCookedWeight(): Decimal | null {
    return copyDecimal(this.props.finalCookedWeight);
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  get finalizedAt(): Date | null {
    return this.props.finalizedAt ? new Date(this.props.finalizedAt) : null;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt ? new Date(this.props.cancelledAt) : null;
  }

  get totalNutrients(): PreparedBatchNutrientSnapshotProps[] {
    return copyNutrients(this.props.totalNutrients);
  }

  get nutrientsPerGram(): Record<string, Decimal> | null {
    if (!this.props.finalCookedWeight) return null;
    return divideNutrients(this.props.totalNutrients, this.props.finalCookedWeight);
  }

  get nutrientsPer100Grams(): Record<string, Decimal> | null {
    const perGram = this.nutrientsPerGram;
    if (!perGram) return null;
    return Object.fromEntries(
      Object.entries(perGram).map(([code, amount]) => [code, amount.mul(100)]),
    );
  }

  replaceIngredients(ingredients: PreparedBatchIngredientProps[]): void {
    this.ensureDraft();
    const normalized = normalizeIngredients(ingredients);
    if (normalized.length === 0) throw new PreparedBatchIngredientsRequiredError();
    this.props.ingredients = normalized;
    this.touch();
  }

  addIngredient(input: Omit<PreparedBatchIngredientProps, 'id'> & { id?: string }): void {
    this.ensureDraft();
    const ingredient = validateIngredient({ ...input, id: input.id ?? crypto.randomUUID() });
    this.props.ingredients = normalizeIngredients([...this.props.ingredients, ingredient]);
    this.touch();
  }

  removeIngredient(ingredientId: string): void {
    this.ensureDraft();
    const ingredients = this.props.ingredients.filter(
      (ingredient) => ingredient.id !== ingredientId,
    );
    if (ingredients.length === this.props.ingredients.length) {
      throw new InvalidPreparedBatchIngredientError();
    }
    if (ingredients.length === 0) throw new PreparedBatchIngredientsRequiredError();
    this.props.ingredients = normalizeIngredients(ingredients);
    this.touch();
  }

  confirmIngredients(snapshots: PreparedBatchNutritionSnapshotInput[], confirmedAt: Date): void {
    this.ensureDraft();
    if (snapshots.length !== this.props.ingredients.length) {
      throw new PreparedBatchSnapshotMismatchError();
    }

    const snapshotsByIngredientId = new Map(
      snapshots.map((snapshot) => [snapshot.ingredientId, snapshot]),
    );
    const ingredientIds = new Set(this.props.ingredients.map((ingredient) => ingredient.id));
    if (
      snapshotsByIngredientId.size !== snapshots.length ||
      snapshots.some(
        (snapshot) =>
          !ingredientIds.has(snapshot.ingredientId) ||
          this.props.ingredients.find((ingredient) => ingredient.id === snapshot.ingredientId)
            ?.foodId !== snapshot.foodId,
      )
    ) {
      throw new PreparedBatchSnapshotMismatchError();
    }

    this.props.ingredients = this.props.ingredients.map((ingredient) => {
      const snapshot = snapshotsByIngredientId.get(ingredient.id)!;
      return {
        ...ingredient,
        foodNameSnapshot: snapshot.foodName,
        brandSnapshot: snapshot.foodBrand,
        preparationStateSnapshot: snapshot.preparationState,
        confidenceLevel: snapshot.confidenceLevel,
        baseQuantity: new Decimal(snapshot.baseQuantity),
        baseUnit: snapshot.baseUnit,
        nutrients: copyNutrients(snapshot.nutrients),
      };
    });
    this.props.totalNutrients = sumNutrients(
      this.props.ingredients.flatMap((ingredient) => ingredient.nutrients),
    );
    this.props.status = 'INGREDIENTS_CONFIRMED';
    this.touch(confirmedAt);
  }

  finalize(finalCookedWeight: Decimal.Value, finalizedAt: Date): void {
    if (this.props.status === 'CANCELLED') throw new PreparedBatchCancelledError();
    if (this.props.status === 'FINALIZED') throw new PreparedBatchAlreadyFinalizedError();
    if (this.props.status !== 'INGREDIENTS_CONFIRMED') {
      throw new PreparedBatchNotConfirmableError();
    }

    const weight = positiveDecimal(finalCookedWeight);
    if (!weight) throw new InvalidPreparedBatchCookedWeightError();

    this.props.finalCookedWeight = weight;
    this.props.status = 'FINALIZED';
    this.props.finalizedAt = new Date(finalizedAt);
    this.touch(finalizedAt);
  }

  cancel(cancelledAt: Date): void {
    if (this.props.status === 'CANCELLED') throw new PreparedBatchCancelledError();
    if (this.props.status === 'FINALIZED') throw new PreparedBatchAlreadyFinalizedError();
    this.props.status = 'CANCELLED';
    this.props.cancelledAt = new Date(cancelledAt);
    this.touch(cancelledAt);
  }

  toProps(): PreparedBatchProps {
    return {
      ...this.props,
      preparedAt: new Date(this.props.preparedAt),
      ingredients: this.ingredients,
      totalNutrients: this.totalNutrients,
      finalCookedWeight: this.finalCookedWeight,
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      finalizedAt: this.finalizedAt,
      cancelledAt: this.cancelledAt,
    };
  }

  private ensureDraft(): void {
    if (this.props.status === 'CANCELLED') throw new PreparedBatchCancelledError();
    if (this.props.status !== 'DRAFT') throw new PreparedBatchNotDraftError();
  }

  private touch(date = new Date()): void {
    this.props.updatedAt = new Date(date);
  }
}

function normalizeIngredients(
  ingredients: PreparedBatchIngredientProps[],
): PreparedBatchIngredientProps[] {
  const normalized = ingredients
    .map(validateIngredient)
    .sort((left, right) => left.position - right.position);
  const positions = new Set<number>();
  const ids = new Set<string>();
  for (const ingredient of normalized) {
    if (positions.has(ingredient.position) || ids.has(ingredient.id)) {
      throw new InvalidPreparedBatchIngredientError();
    }
    positions.add(ingredient.position);
    ids.add(ingredient.id);
  }
  return normalized.map((ingredient, index) => ({ ...ingredient, position: index + 1 }));
}

function validateIngredient(input: PreparedBatchIngredientProps): PreparedBatchIngredientProps {
  if (
    !input.id ||
    !input.foodId ||
    !input.unit ||
    !Number.isInteger(input.position) ||
    input.position <= 0
  ) {
    throw new InvalidPreparedBatchIngredientError();
  }
  if (input.unit === 'SERVING' && !input.servingId) {
    throw new InvalidPreparedBatchIngredientError();
  }
  if (input.unit !== 'SERVING' && input.servingId) {
    throw new InvalidPreparedBatchIngredientError();
  }
  const quantity = positiveDecimal(input.quantity);
  if (!quantity) throw new InvalidPreparedBatchIngredientError();

  return {
    ...input,
    quantity,
    notes: input.notes?.trim() || null,
    foodNameSnapshot: input.foodNameSnapshot?.trim() || null,
    brandSnapshot: input.brandSnapshot?.trim() || null,
    baseQuantity: copyDecimal(input.baseQuantity),
    nutrients: copyNutrients(input.nutrients),
  };
}

function positiveDecimal(value: Decimal.Value | null): Decimal | null {
  if (value === null) return null;
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && decimal.gt(0) ? decimal : null;
  } catch {
    return null;
  }
}

function copyDecimal(value: Decimal | null): Decimal | null {
  return value ? new Decimal(value) : null;
}

function copyIngredient(ingredient: PreparedBatchIngredientProps): PreparedBatchIngredientProps {
  return {
    ...ingredient,
    quantity: new Decimal(ingredient.quantity),
    baseQuantity: copyDecimal(ingredient.baseQuantity),
    nutrients: copyNutrients(ingredient.nutrients),
  };
}

function copyNutrients(
  nutrients: PreparedBatchNutrientSnapshotProps[],
): PreparedBatchNutrientSnapshotProps[] {
  return nutrients.map((nutrient) => ({ ...nutrient, amount: new Decimal(nutrient.amount) }));
}

function sumNutrients(
  nutrients: PreparedBatchNutrientSnapshotProps[],
): PreparedBatchNutrientSnapshotProps[] {
  const totals = new Map<string, PreparedBatchNutrientSnapshotProps>();
  for (const nutrient of nutrients) {
    const current = totals.get(nutrient.code);
    totals.set(nutrient.code, {
      code: nutrient.code,
      name: nutrient.name,
      unit: nutrient.unit,
      amount: current ? current.amount.add(nutrient.amount) : new Decimal(nutrient.amount),
    });
  }
  return [...totals.values()].sort((left, right) => left.code.localeCompare(right.code));
}

function divideNutrients(
  nutrients: PreparedBatchNutrientSnapshotProps[],
  divisor: Decimal,
): Record<string, Decimal> {
  return Object.fromEntries(
    nutrients.map((nutrient) => [nutrient.code, nutrient.amount.div(divisor)]),
  );
}
