import Decimal from 'decimal.js';
import {
  InvalidMealPlanningError,
  MealPlanningTransitionError,
} from '../errors/meal-planning.errors';
import type {
  PlannedMealParticipantProps,
  NutritionTargetSnapshot,
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
      nutritionTargetSnapshot: cloneSnapshot(input.nutritionTargetSnapshot),
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
      nutritionTargetSnapshot: cloneSnapshot(props.nutritionTargetSnapshot),
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
    occurredAt: Date;
  }): void {
    const suggested =
      input.suggestedQuantity == null
        ? null
        : PlannedQuantity.from(input.suggestedQuantity, input.suggestedUnit ?? '');
    this.props.suggestedQuantity = suggested?.toDecimal() ?? null;
    this.props.suggestedUnit = suggested?.unit ?? null;
    if (input.notes !== undefined) this.props.notes = input.notes?.trim() || null;
    this.props.updatedAt = new Date(input.occurredAt);
  }

  confirmQuantity(quantity: Decimal.Value, unit: string, occurredAt: Date): void {
    if (this.props.confirmedQuantity)
      throw new MealPlanningTransitionError('Participant quantity is already confirmed.');
    const confirmed = PlannedQuantity.from(quantity, unit);
    this.props.confirmedQuantity = confirmed.toDecimal();
    this.props.confirmedUnit = confirmed.unit;
    this.props.updatedAt = new Date(occurredAt);
  }

  toProps(): PlannedMealParticipantProps {
    return {
      ...this.props,
      suggestedQuantity: this.props.suggestedQuantity && new Decimal(this.props.suggestedQuantity),
      confirmedQuantity: this.props.confirmedQuantity && new Decimal(this.props.confirmedQuantity),
      nutritionTargetSnapshot: cloneSnapshot(this.props.nutritionTargetSnapshot),
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
