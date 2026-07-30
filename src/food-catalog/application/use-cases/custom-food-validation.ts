import { InvalidFoodInputError } from '../errors/food-catalog-mutation.errors';
import { NutrientDefinitionView } from '../models/food-catalog.models';
import { FoodNutrientInput, FoodServingInput } from '../ports/food-catalog-mutation.port';

export function ensurePositiveReferenceQuantity(referenceQuantity: number | undefined): void {
  if (
    referenceQuantity !== undefined &&
    (!Number.isFinite(referenceQuantity) || referenceQuantity <= 0)
  ) {
    throw new InvalidFoodInputError('Reference quantity must be greater than zero.');
  }
}

export function validateNutrients(
  nutrients: FoodNutrientInput[] | undefined,
  definitions: NutrientDefinitionView[],
): void {
  if (nutrients === undefined) return;

  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const suppliedIds = new Set<string>();

  for (const nutrient of nutrients) {
    if (!Number.isFinite(nutrient.amount) || nutrient.amount < 0) {
      throw new InvalidFoodInputError('Nutrient amounts cannot be negative.');
    }
    if (suppliedIds.has(nutrient.nutrientDefinitionId)) {
      throw new InvalidFoodInputError('Each nutrient can only be supplied once.');
    }
    if (!definitionById.has(nutrient.nutrientDefinitionId)) {
      throw new InvalidFoodInputError('An unknown nutrient definition was supplied.');
    }
    suppliedIds.add(nutrient.nutrientDefinitionId);
  }

  const missingRequired = definitions.some(
    (definition) => definition.isRequired && !suppliedIds.has(definition.id),
  );
  if (missingRequired) {
    throw new InvalidFoodInputError('All required nutrients must be supplied.');
  }
}

export function validateServings(servings: FoodServingInput[] | undefined): void {
  if (servings === undefined) return;

  for (const serving of servings) {
    const grams = serving.equivalentGrams;
    const milliliters = serving.equivalentMilliliters;
    if (!Number.isFinite(serving.quantity) || serving.quantity <= 0) {
      throw new InvalidFoodInputError('Serving quantity must be greater than zero.');
    }
    if (
      (grams === undefined || grams === null) &&
      (milliliters === undefined || milliliters === null)
    ) {
      throw new InvalidFoodInputError(
        'A serving must have an equivalence in grams or milliliters.',
      );
    }
    if (
      (grams !== undefined && grams !== null && (!Number.isFinite(grams) || grams <= 0)) ||
      (milliliters !== undefined &&
        milliliters !== null &&
        (!Number.isFinite(milliliters) || milliliters <= 0))
    ) {
      throw new InvalidFoodInputError('Serving equivalences must be greater than zero.');
    }
  }
}
