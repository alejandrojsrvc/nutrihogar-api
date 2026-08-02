import Decimal from 'decimal.js';
import { InvalidMealPlanningError } from '../errors/meal-planning.errors';
import {
  PlannedMealParticipantStatus,
  type PlannedMealParticipantProps,
  type NutritionTargetSnapshot,
} from '../models/meal-planning.models';
import { PlannedQuantity } from '../value-objects/planned-meal';
import { PlannedMealParticipantId } from '../value-objects/identifiers';

export class PlannedMealParticipant {
  private constructor(private props: PlannedMealParticipantProps) {}

  static create(input: {
    id: string;
    adultProfileId: string;
    suggestedQuantity?: Decimal.Value | null;
    suggestedUnit?: string | null;
    nutritionTargetSnapshot?: NutritionTargetSnapshot | null;
    notes?: string | null;
    occurredAt: Date;
  }): PlannedMealParticipant {
    if (!input.adultProfileId.trim())
      throw new InvalidMealPlanningError('Adult profile id is required.');
    const suggested =
      input.suggestedQuantity == null
        ? null
        : PlannedQuantity.from(input.suggestedQuantity, input.suggestedUnit ?? '');
    return new PlannedMealParticipant({
      id: PlannedMealParticipantId.from(input.id).value,
      adultProfileId: input.adultProfileId.trim(),
      suggestedQuantity: suggested?.toDecimal() ?? null,
      suggestedUnit: suggested?.unit ?? null,
      confirmedQuantity: null,
      confirmedUnit: null,
      confirmedById: null,
      confirmedAt: null,
      confirmationSnapshot: null,
      nutritionTargetSnapshot: cloneSnapshot(input.nutritionTargetSnapshot),
      status: PlannedMealParticipantStatus.PLANNED,
      consumedMealId: null,
      notes: input.notes?.trim() || null,
      createdAt: new Date(input.occurredAt),
      updatedAt: new Date(input.occurredAt),
    });
  }

  static reconstitute(props: PlannedMealParticipantProps): PlannedMealParticipant {
    return new PlannedMealParticipant({
      ...props,
      suggestedQuantity: props.suggestedQuantity && new Decimal(props.suggestedQuantity),
      confirmedQuantity: props.confirmedQuantity && new Decimal(props.confirmedQuantity),
      confirmedById: props.confirmedById ?? null,
      confirmedAt: props.confirmedAt && new Date(props.confirmedAt),
      confirmationSnapshot: cloneSnapshot(props.confirmationSnapshot),
      nutritionTargetSnapshot: cloneSnapshot(props.nutritionTargetSnapshot),
      status: props.status ?? PlannedMealParticipantStatus.PLANNED,
      consumedMealId: props.consumedMealId ?? null,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get adultProfileId(): string {
    return this.props.adultProfileId;
  }

  update(input: {
    notes?: string | null;
    suggestedQuantity?: Decimal.Value | null;
    suggestedUnit?: string | null;
    nutritionTargetSnapshot?: NutritionTargetSnapshot | null;
    occurredAt: Date;
  }): void {
    if (input.suggestedQuantity !== undefined || input.suggestedUnit !== undefined) {
      const suggested =
        input.suggestedQuantity == null
          ? null
          : PlannedQuantity.from(input.suggestedQuantity, input.suggestedUnit ?? '');
      this.props.suggestedQuantity = suggested?.toDecimal() ?? null;
      this.props.suggestedUnit = suggested?.unit ?? null;
    }
    if (input.nutritionTargetSnapshot !== undefined)
      this.props.nutritionTargetSnapshot = cloneSnapshot(input.nutritionTargetSnapshot);
    if (input.notes !== undefined) this.props.notes = input.notes?.trim() || null;
    this.props.updatedAt = new Date(input.occurredAt);
  }

  confirmQuantity(quantity: Decimal.Value, unit: string, actorId: string, occurredAt: Date): void {
    const confirmed = PlannedQuantity.from(quantity, unit);
    this.props.confirmedQuantity = confirmed.toDecimal();
    this.props.confirmedUnit = confirmed.unit;
    this.props.confirmedById = actorId;
    this.props.confirmedAt = new Date(occurredAt);
    this.props.confirmationSnapshot = {
      quantity: confirmed.toDecimal().toString(),
      unit: confirmed.unit,
      actorId,
      confirmedAt: occurredAt.toISOString(),
      suggestedQuantity: this.props.suggestedQuantity?.toString() ?? null,
      suggestedUnit: this.props.suggestedUnit,
    };
    this.props.updatedAt = new Date(occurredAt);
  }

  consume(mealId: string, occurredAt: Date): void {
    if (this.props.status !== PlannedMealParticipantStatus.PLANNED)
      throw new InvalidMealPlanningError('Participant is already completed.');
    this.props.status = PlannedMealParticipantStatus.CONSUMED;
    this.props.consumedMealId = mealId;
    this.props.updatedAt = new Date(occurredAt);
  }

  skip(occurredAt: Date): void {
    if (this.props.status !== PlannedMealParticipantStatus.PLANNED)
      throw new InvalidMealPlanningError('Participant is already completed.');
    this.props.status = PlannedMealParticipantStatus.SKIPPED;
    this.props.updatedAt = new Date(occurredAt);
  }

  toProps(): PlannedMealParticipantProps {
    return {
      ...this.props,
      suggestedQuantity: this.props.suggestedQuantity && new Decimal(this.props.suggestedQuantity),
      confirmedQuantity: this.props.confirmedQuantity && new Decimal(this.props.confirmedQuantity),
      confirmedById: this.props.confirmedById,
      confirmedAt: this.props.confirmedAt && new Date(this.props.confirmedAt),
      confirmationSnapshot: cloneSnapshot(this.props.confirmationSnapshot),
      nutritionTargetSnapshot: cloneSnapshot(this.props.nutritionTargetSnapshot),
      status: this.props.status,
      consumedMealId: this.props.consumedMealId,
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }
}

function cloneSnapshot(
  snapshot: NutritionTargetSnapshot | null | undefined,
): NutritionTargetSnapshot | null {
  return snapshot == null ? null : structuredClone(snapshot);
}
