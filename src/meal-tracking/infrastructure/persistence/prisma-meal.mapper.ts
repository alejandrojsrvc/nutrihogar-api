import { Meal, MealItem, MealItemNutrientSnapshot } from '@prisma/client';
import Decimal from 'decimal.js';
import { MealItemView, MealNutrientSnapshotView, MealView } from '../../domain/models/meal.models';

type MealRecord = Meal & {
  items: (MealItem & { nutrientSnapshots: MealItemNutrientSnapshot[] })[];
};

export class PrismaMealMapper {
  static toView(record: MealRecord): MealView {
    return {
      id: record.id,
      householdId: record.householdId,
      adultProfileId: record.adultProfileId,
      mealType: record.mealType,
      consumedAt: record.consumedAt,
      status: record.status,
      source: record.source,
      notes: record.notes,
      createdById: record.createdById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      items: record.items.map((item) => toItemView(item)),
    };
  }
}

function toItemView(
  record: MealItem & { nutrientSnapshots: MealItemNutrientSnapshot[] },
): MealItemView {
  return {
    id: record.id,
    foodId: record.foodId,
    foodServingId: record.foodServingId,
    nameSnapshot: record.nameSnapshot,
    brandSnapshot: record.brandSnapshot,
    preparationStateSnapshot: record.preparationStateSnapshot,
    quantity: new Decimal(record.quantity.toString()),
    unit: record.unit,
    baseQuantity: new Decimal(record.baseQuantity.toString()),
    baseUnit: record.baseUnit,
    measurementMethod: record.measurementMethod,
    confidenceLevel: record.confidenceLevel,
    nutrients: record.nutrientSnapshots.map(toNutrientView),
  };
}

function toNutrientView(record: MealItemNutrientSnapshot): MealNutrientSnapshotView {
  return {
    id: record.id,
    nutrientCode: record.nutrientCode,
    nutrientName: record.nutrientName,
    unit: record.unit,
    amount: new Decimal(record.amount.toString()),
  };
}
