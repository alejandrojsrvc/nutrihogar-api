import Decimal from 'decimal.js';
import type {
  NutritionTargetSnapshot,
  PlannedMealParticipantProps,
} from '../../domain/models/meal-planning.models';

export interface PrismaPlannedMealParticipantRecord {
  id: string;
  adultProfileId: string;
  suggestedQuantity: { toString(): string } | null;
  suggestedUnit: string | null;
  confirmedQuantity: { toString(): string } | null;
  confirmedUnit: string | null;
  confirmedById?: string | null;
  confirmedAt?: Date | null;
  confirmationSnapshot?: unknown;
  nutritionTargetSnapshot: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaPlannedMealParticipantMapper {
  static toDomain(record: PrismaPlannedMealParticipantRecord): PlannedMealParticipantProps {
    return {
      id: record.id,
      adultProfileId: record.adultProfileId,
      suggestedQuantity: decimalOrNull(record.suggestedQuantity),
      suggestedUnit: record.suggestedUnit,
      confirmedQuantity: decimalOrNull(record.confirmedQuantity),
      confirmedUnit: record.confirmedUnit,
      confirmedById: record.confirmedById,
      confirmedAt: record.confirmedAt && new Date(record.confirmedAt),
      confirmationSnapshot: objectSnapshot(record.confirmationSnapshot),
      nutritionTargetSnapshot: objectSnapshot(record.nutritionTargetSnapshot),
      notes: record.notes,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }

  static toPersistence(
    props: PlannedMealParticipantProps,
    plannedMealId: string,
  ): {
    id: string;
    plannedMealId: string;
    adultProfileId: string;
    suggestedQuantity: string | null;
    suggestedUnit: string | null;
    confirmedQuantity: string | null;
    confirmedUnit: string | null;
    confirmedById: string | null;
    confirmedAt: Date | null;
    confirmationSnapshot: NutritionTargetSnapshot | null;
    nutritionTargetSnapshot: NutritionTargetSnapshot | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: props.id,
      plannedMealId,
      adultProfileId: props.adultProfileId,
      suggestedQuantity: props.suggestedQuantity?.toString() ?? null,
      suggestedUnit: props.suggestedUnit,
      confirmedQuantity: props.confirmedQuantity?.toString() ?? null,
      confirmedUnit: props.confirmedUnit,
      confirmedById: props.confirmedById,
      confirmedAt: props.confirmedAt ? new Date(props.confirmedAt) : null,
      confirmationSnapshot: props.confirmationSnapshot,
      nutritionTargetSnapshot: props.nutritionTargetSnapshot,
      notes: props.notes,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    };
  }
}

function decimalOrNull(value: { toString(): string } | null): Decimal | null {
  return value == null ? null : new Decimal(value.toString());
}

function objectSnapshot(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  return structuredClone(value) as Record<string, unknown>;
}
