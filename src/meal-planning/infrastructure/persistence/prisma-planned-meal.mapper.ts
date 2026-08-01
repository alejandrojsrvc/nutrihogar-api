import type { PlannedMealProps } from '../../domain/models/meal-planning.models';
import {
  PlannedMealSource,
  PlannedMealStatus,
  PlannedMealType,
} from '../../domain/value-objects/planned-meal';
import { PrismaPlannedMealParticipantMapper } from './prisma-planned-meal-participant.mapper';
import type { PrismaPlannedMealParticipantRecord } from './prisma-planned-meal-participant.mapper';

export interface PrismaPlannedMealRecord {
  id: string;
  date: Date;
  type: string;
  source: string;
  recipeId: string | null;
  nameSnapshot: string | null;
  nutritionSnapshot: unknown;
  notes: string | null;
  status: string;
  position: number;
  replacedMealId: string | null;
  preparedBatchId: string | null;
  mealId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: PrismaPlannedMealParticipantRecord[];
}

export class PrismaPlannedMealMapper {
  static toDomain(record: PrismaPlannedMealRecord): PlannedMealProps {
    return {
      id: record.id,
      date: new Date(record.date),
      type: record.type as PlannedMealType,
      source: record.source as PlannedMealSource,
      recipeId: record.recipeId,
      nameSnapshot: record.nameSnapshot,
      nutritionSnapshot: objectSnapshot(record.nutritionSnapshot),
      notes: record.notes,
      status: record.status as PlannedMealStatus,
      participants: record.participants.map((participant) =>
        PrismaPlannedMealParticipantMapper.toDomain(participant),
      ),
      position: record.position,
      replacedMealId: record.replacedMealId,
      preparedBatchId: record.preparedBatchId,
      mealId: record.mealId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }

  static toPersistence(
    props: PlannedMealProps,
    weeklyPlanId: string,
  ): {
    id: string;
    weeklyPlanId: string;
    date: Date;
    type: PlannedMealType;
    source: PlannedMealSource;
    recipeId: string | null;
    nameSnapshot: string | null;
    nutritionSnapshot: Record<string, unknown> | null;
    notes: string | null;
    status: PlannedMealStatus;
    position: number;
    replacedMealId: string | null;
    preparedBatchId: string | null;
    mealId: string | null;
    createdAt: Date;
    updatedAt: Date;
    participants: ReturnType<typeof PrismaPlannedMealParticipantMapper.toPersistence>[];
  } {
    return {
      id: props.id,
      weeklyPlanId,
      date: new Date(props.date),
      type: props.type,
      source: props.source,
      recipeId: props.recipeId,
      nameSnapshot: props.nameSnapshot,
      nutritionSnapshot: props.nutritionSnapshot,
      notes: props.notes,
      status: props.status,
      position: props.position,
      replacedMealId: props.replacedMealId,
      preparedBatchId: props.preparedBatchId,
      mealId: props.mealId,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      participants: props.participants.map((participant) =>
        PrismaPlannedMealParticipantMapper.toPersistence(participant, props.id),
      ),
    };
  }
}

function objectSnapshot(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  return structuredClone(value) as Record<string, unknown>;
}
