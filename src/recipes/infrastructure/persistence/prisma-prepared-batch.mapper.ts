import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import {
  PreparedBatchIngredientProps,
  PreparedBatchNutrientSnapshotProps,
  PreparedBatchProps,
} from '../../domain/models/prepared-batch.models';

export const preparedBatchInclude = {
  ingredients: {
    include: { nutrientSnapshots: true },
    orderBy: { position: 'asc' },
  },
  nutrientSnapshots: true,
} satisfies Prisma.PreparedBatchInclude;

export type PreparedBatchRecord = Prisma.PreparedBatchGetPayload<{
  include: typeof preparedBatchInclude;
}>;

export class PrismaPreparedBatchMapper {
  static toDomain(record: PreparedBatchRecord): PreparedBatch {
    const props: PreparedBatchProps = {
      id: record.id,
      householdId: record.householdId,
      recipeId: record.recipeId,
      recipeNameSnapshot: record.recipeNameSnapshot,
      preparedAt: record.preparedAt,
      status: record.status,
      ingredients: record.ingredients.map((ingredient) => toIngredient(ingredient)),
      totalNutrients: record.nutrientSnapshots.map((nutrient) => toNutrient(nutrient)),
      finalCookedWeight: toDecimal(record.finalCookedWeight),
      createdById: record.createdById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      finalizedAt: record.finalizedAt,
      cancelledAt: record.cancelledAt,
    };

    return PreparedBatch.reconstitute(props);
  }

  static toPersistence(batch: PreparedBatch) {
    const props = batch.toProps();
    return {
      id: props.id,
      householdId: props.householdId,
      recipeId: props.recipeId,
      recipeNameSnapshot: props.recipeNameSnapshot,
      preparedAt: props.preparedAt,
      status: props.status,
      finalCookedWeight: props.finalCookedWeight?.toString() ?? null,
      createdById: props.createdById,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      finalizedAt: props.finalizedAt,
      cancelledAt: props.cancelledAt,
      ingredients: props.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        foodServingId: ingredient.servingId,
        quantity: ingredient.quantity.toString(),
        unit: ingredient.unit,
        position: ingredient.position,
        notes: ingredient.notes,
        foodNameSnapshot: ingredient.foodNameSnapshot,
        brandSnapshot: ingredient.brandSnapshot,
        preparationStateSnapshot: ingredient.preparationStateSnapshot,
        confidenceLevel: ingredient.confidenceLevel,
        baseQuantity: ingredient.baseQuantity?.toString() ?? null,
        baseUnit: ingredient.baseUnit,
        nutrients: ingredient.nutrients.map((nutrient) => ({
          code: nutrient.code,
          name: nutrient.name,
          unit: nutrient.unit,
          amount: nutrient.amount.toString(),
        })),
      })),
      totalNutrients: props.totalNutrients.map((nutrient) => ({
        code: nutrient.code,
        name: nutrient.name,
        unit: nutrient.unit,
        amount: nutrient.amount.toString(),
      })),
    };
  }
}

function toIngredient(
  ingredient: PreparedBatchRecord['ingredients'][number],
): PreparedBatchIngredientProps {
  return {
    id: ingredient.id,
    foodId: ingredient.foodId,
    quantity: new Decimal(ingredient.quantity.toString()),
    unit: ingredient.unit,
    servingId: ingredient.foodServingId,
    position: ingredient.position,
    notes: ingredient.notes,
    foodNameSnapshot: ingredient.foodNameSnapshot,
    brandSnapshot: ingredient.brandSnapshot,
    preparationStateSnapshot: ingredient.preparationStateSnapshot,
    confidenceLevel: ingredient.confidenceLevel,
    baseQuantity: toDecimal(ingredient.baseQuantity),
    baseUnit: ingredient.baseUnit as PreparedBatchIngredientProps['baseUnit'],
    nutrients: ingredient.nutrientSnapshots.map((nutrient) => toNutrient(nutrient)),
  };
}

function toNutrient(nutrient: {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  amount: Prisma.Decimal;
}): PreparedBatchNutrientSnapshotProps {
  return {
    code: nutrient.nutrientCode,
    name: nutrient.nutrientName,
    unit: nutrient.unit,
    amount: new Decimal(nutrient.amount.toString()),
  };
}

function toDecimal(value: Prisma.Decimal | null): Decimal | null {
  return value ? new Decimal(value.toString()) : null;
}
