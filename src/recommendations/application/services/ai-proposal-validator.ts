import type { FoodCatalogReadRepository } from '../../../food-catalog/application/ports/food-catalog-read-repository.port';
import type { InventoryItemRepository } from '../../../inventory/application/ports/inventory-repository.port';
import type { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import type { RecipeRepository } from '../../../recipes/application/ports/recipe-repository.port';
import { AiProposalValidation } from '../../domain/entities/ai-proposal-validation';
import type { ValidationMessage } from '../../domain/models/ai-recommendation.models';

export interface AiProposalValidationInput {
  proposalId: string;
  payload: Record<string, unknown>;
  householdId: string;
  actorId: string;
  adultProfileIds: string[];
  restrictions?: string[];
  weekStart?: string;
  mealTypes?: string[];
  validatedAt: Date;
}

interface FoodReference {
  foodId: string;
  quantity: number;
  unit: 'GRAM' | 'MILLILITER' | 'UNIT' | 'SERVING';
  servingId?: string;
  reference: string;
}

export class AiProposalValidator {
  constructor(
    private readonly foods: FoodCatalogReadRepository,
    private readonly recipes: RecipeRepository,
    private readonly inventory: InventoryItemRepository,
    private readonly nutrition: NutritionEngineService,
  ) {}

  async validate(input: AiProposalValidationInput): Promise<AiProposalValidation> {
    const errors: ValidationMessage[] = [];
    const warnings: ValidationMessage[] = [];
    const payload = input.payload;
    const days = payload.days;
    const isWeekly = Array.isArray(days) || input.weekStart !== undefined;

    if (isWeekly && !Array.isArray(days))
      errors.push(block('INVALID_DAYS', 'Proposal days must be an array.'));
    if (
      input.mealTypes &&
      (!input.mealTypes.length || input.mealTypes.some((type) => !VALID_MEAL_TYPES.has(type)))
    ) {
      errors.push(block('INVALID_MEAL_TYPES', 'At least one meal type is required.'));
    }
    if (input.weekStart && !validDate(input.weekStart))
      errors.push(block('INVALID_WEEK_START', 'Week start is invalid.'));

    const references = collectReferences(payload, errors);
    for (const adultId of readStrings(payload.adultProfileIds)) {
      if (!input.adultProfileIds.includes(adultId))
        errors.push(
          block(
            'PARTICIPANT_OUTSIDE_HOUSEHOLD',
            'Participant does not belong to the household.',
            adultId,
          ),
        );
    }
    if (isWeekly) validateDays(days, input, errors);

    for (const recipeId of collectRecipeIds(payload)) {
      const recipe = await this.recipes.findByIdForHousehold(recipeId, input.householdId);
      if (!recipe) {
        errors.push(
          block(
            'RECIPE_NOT_FOUND',
            'Recipe reference does not exist or is not accessible.',
            recipeId,
          ),
        );
        continue;
      }
      for (const ingredient of recipe.ingredients) {
        references.push({
          foodId: ingredient.foodId,
          quantity: Number(ingredient.quantity),
          unit: ingredient.unit,
          servingId: ingredient.servingId ?? undefined,
          reference: `recipe:${recipeId}:${ingredient.id}`,
        });
      }
    }
    const inventoryRequirements = new Map<string, number>();
    for (const reference of references) {
      const food = await this.foods.findVisibleById({
        actorId: input.actorId,
        foodId: reference.foodId,
      });
      if (!food) {
        errors.push(
          block(
            'FOOD_NOT_FOUND',
            'Food reference does not exist or is not accessible.',
            reference.reference,
          ),
        );
        continue;
      }
      if (input.restrictions?.some((restriction) => matchesRestriction(food.name, restriction))) {
        errors.push(
          block(
            'FOOD_RESTRICTED',
            'Food conflicts with a household restriction.',
            reference.reference,
          ),
        );
      }
      const quantity = reference.quantity;
      try {
        const result = await this.nutrition.calculate({
          actorId: input.actorId,
          householdId: input.householdId,
          foodId: food.id,
          quantity,
          unit: reference.unit,
          servingId: reference.servingId,
        });
        const kcal = result.nutrients.kcal ?? result.nutrients.energy_kcal;
        if (kcal !== undefined)
          warnings.push(
            info(
              'NUTRITION_RECALCULATED',
              `Recalculated nutrients for ${food.name}: ${kcal.toString()} kcal.`,
              reference.reference,
            ),
          );
      } catch (error) {
        errors.push(
          block(
            'UNIT_IMPOSSIBLE',
            error instanceof Error ? error.message : 'Food quantity or unit is invalid.',
            reference.reference,
          ),
        );
      }
      const key = `${food.id}|${reference.unit === 'SERVING' ? food.referenceUnit : reference.unit}`;
      inventoryRequirements.set(key, (inventoryRequirements.get(key) ?? 0) + quantity);
    }

    const inventoryItems = await this.inventory.listByHousehold(input.householdId, {
      page: 1,
      limit: 500,
      status: 'ACTIVE',
    });
    for (const [key, required] of inventoryRequirements) {
      const [foodId, unit] = key.split('|');
      const available = inventoryItems.items
        .filter((item) => item.foodId === foodId && item.unit === unit)
        .reduce((sum, item) => sum + Number(item.currentQuantity), 0);
      if (available < required)
        warnings.push({
          code: 'INVENTORY_MISSING',
          severity: 'WARNING',
          message: 'Inventory is insufficient for this proposal.',
          itemReference: foodId,
        });
    }
    if (references.some((reference) => reference.quantity > 2000))
      warnings.push({
        code: 'EXTREME_PORTION',
        severity: 'WARNING',
        message: 'The proposed portion is unusually large.',
      });

    return AiProposalValidation.create({
      id: crypto.randomUUID(),
      proposalId: input.proposalId,
      schemaValid: errors.every(
        (error) =>
          ![
            'INVALID_DAYS',
            'INVALID_MEAL_TYPES',
            'INVALID_DAY',
            'INVALID_MEAL_TYPE',
            'INVALID_QUANTITY',
          ].includes(error.code),
      ),
      catalogValid: !errors.some(
        (error) => error.code === 'FOOD_NOT_FOUND' || error.code === 'RECIPE_NOT_FOUND',
      ),
      nutritionValid: !errors.some((error) => error.code === 'UNIT_IMPOSSIBLE'),
      restrictionsValid: !errors.some((error) => error.code === 'FOOD_RESTRICTED'),
      inventoryValid: !warnings.some((warning) => warning.code === 'INVENTORY_MISSING'),
      budgetEvaluated: false,
      warnings,
      errors,
      validatedAt: input.validatedAt,
    });
  }
}

const VALID_MEAL_TYPES = new Set(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'EXTRA']);
const UNITS = new Set(['GRAM', 'MILLILITER', 'UNIT', 'SERVING']);

function validateDays(
  days: unknown,
  input: AiProposalValidationInput,
  errors: ValidationMessage[],
): void {
  for (const day of Array.isArray(days) ? days : []) {
    if (!object(day) || typeof day.date !== 'string') {
      errors.push(block('INVALID_DAY', 'Every proposal day must have a date.'));
      continue;
    }
    if (input.weekStart && !inWeek(day.date, input.weekStart))
      errors.push(block('DATE_OUTSIDE_WEEK', 'Proposal day is outside the requested week.'));
    if (!Array.isArray(day.meals)) {
      errors.push(block('INVALID_MEALS', 'Every proposal day must contain meals.'));
      continue;
    }
    for (const meal of day.meals)
      if (!object(meal) || typeof meal.type !== 'string' || !VALID_MEAL_TYPES.has(meal.type))
        errors.push(block('INVALID_MEAL_TYPE', 'Meal type is invalid.'));
  }
}

function collectReferences(
  value: unknown,
  errors: ValidationMessage[],
  path = 'payload',
): FoodReference[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) => collectReferences(item, errors, `${path}[${index}]`));
  if (!object(value)) return [];
  const references: FoodReference[] = [];
  if (typeof value.foodId === 'string') {
    const quantity = typeof value.quantity === 'number' ? value.quantity : Number(value.quantity);
    const unit = typeof value.unit === 'string' ? value.unit : '';
    if (!Number.isFinite(quantity) || quantity <= 0)
      errors.push(block('INVALID_QUANTITY', 'Food quantities must be positive.', path));
    if (!UNITS.has(unit))
      errors.push(block('UNIT_IMPOSSIBLE', 'Food unit is not supported.', path));
    if (Number.isFinite(quantity) && quantity > 0 && UNITS.has(unit))
      references.push({
        foodId: value.foodId,
        quantity,
        unit: unit as FoodReference['unit'],
        servingId: typeof value.servingId === 'string' ? value.servingId : undefined,
        reference: path,
      });
  }
  for (const [key, child] of Object.entries(value))
    if (key !== 'foodId' && key !== 'quantity' && key !== 'unit' && key !== 'servingId')
      references.push(...collectReferences(child, errors, `${path}.${key}`));
  return references;
}

function collectRecipeIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectRecipeIds);
  if (!object(value)) return [];
  const ids = typeof value.recipeId === 'string' ? [value.recipeId] : [];
  return ids.concat(
    ...Object.entries(value)
      .filter(([key]) => key !== 'recipeId')
      .map(([, child]) => collectRecipeIds(child)),
  );
}
function readStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
function object(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}
function inWeek(value: string, startValue: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  const start = new Date(`${startValue}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return validDate(value) && validDate(startValue) && date >= start && date <= end;
}
function matchesRestriction(food: string, restriction: string): boolean {
  const normalizedFood = food.toLowerCase();
  const normalizedRestriction = restriction.toLowerCase();
  return (
    ((normalizedRestriction.includes('lactosa') || normalizedRestriction.includes('lactose')) &&
      (normalizedFood.includes('leche') || normalizedFood.includes('lactosa'))) ||
    ((normalizedRestriction.includes('gluten') || normalizedRestriction.includes('trigo')) &&
      (normalizedFood.includes('gluten') || normalizedFood.includes('trigo')))
  );
}
function block(code: string, message: string, itemReference?: string): ValidationMessage {
  return { code, severity: 'BLOCKING', message, ...(itemReference ? { itemReference } : {}) };
}
function info(code: string, message: string, itemReference?: string): ValidationMessage {
  return { code, severity: 'INFO', message, ...(itemReference ? { itemReference } : {}) };
}
