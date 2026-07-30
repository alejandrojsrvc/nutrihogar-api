import { NutritionGoal, NutritionGoalSuggestion, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import {
  CalculationSnapshot,
  NutritionGoalSuggestionView,
  NutritionGoalView,
} from '../../domain/models/nutrition-goal.models';

export class PrismaNutritionGoalMapper {
  static suggestionToView(record: NutritionGoalSuggestion): NutritionGoalSuggestionView {
    return {
      id: record.id,
      adultProfileId: record.adultProfileId,
      calculationMethod: record.calculationMethod,
      calculationInput: toSnapshot(record.calculationInput),
      bmr: new Decimal(record.bmr.toString()),
      tdee: new Decimal(record.tdee.toString()),
      values: {
        calories: new Decimal(record.suggestedCalories.toString()),
        proteinGrams: new Decimal(record.suggestedProteinGrams.toString()),
        carbohydrateGrams: new Decimal(record.suggestedCarbohydrateGrams.toString()),
        fatGrams: new Decimal(record.suggestedFatGrams.toString()),
        fiberGrams: new Decimal(record.suggestedFiberGrams.toString()),
      },
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  static goalToView(record: NutritionGoal): NutritionGoalView {
    return {
      id: record.id,
      adultProfileId: record.adultProfileId,
      validFrom: record.validFrom,
      validUntil: record.validUntil,
      values: {
        calories: new Decimal(record.dailyCalories.toString()),
        proteinGrams: new Decimal(record.proteinGrams.toString()),
        carbohydrateGrams: new Decimal(record.carbohydrateGrams.toString()),
        fatGrams: new Decimal(record.fatGrams.toString()),
        fiberGrams: new Decimal(record.fiberGrams.toString()),
      },
      goalType: record.goalType,
      calculationMethod: record.calculationMethod,
      calculationInput: toSnapshot(record.calculationInput),
      confirmedById: record.confirmedById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  static snapshotToPrisma(snapshot: CalculationSnapshot): Prisma.InputJsonObject {
    return structuredClone(snapshot);
  }
}

function toSnapshot(value: Prisma.JsonValue): CalculationSnapshot {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return structuredClone(value) as CalculationSnapshot;
}
