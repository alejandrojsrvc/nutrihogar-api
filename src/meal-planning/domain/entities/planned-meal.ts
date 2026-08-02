import Decimal from 'decimal.js';
import { PlannedMealParticipant } from './planned-meal-participant';
import {
  InvalidMealPlanningError,
  MealPlanningTransitionError,
} from '../errors/meal-planning.errors';
import {
  PlannedMealParticipantStatus,
  type PlannedMealProps,
} from '../models/meal-planning.models';
import {
  PlannedMealSource,
  PlannedMealStatus,
  PlannedMealType,
} from '../value-objects/planned-meal';
import { PlannedMealId } from '../value-objects/identifiers';

export interface PlannedMealInput {
  id: string;
  date: Date;
  type: PlannedMealType;
  source: PlannedMealSource;
  recipeId?: string | null;
  nameSnapshot?: string | null;
  notes?: string | null;
  nutritionSnapshot?: Record<string, unknown> | null;
  position: number;
  occurredAt: Date;
  replacedMealId?: string | null;
  preparedBatchId?: string | null;
  mealId?: string | null;
  previousMealId?: string | null;
}

export class PlannedMeal {
  private constructor(
    private props: PlannedMealProps,
    private readonly participantEntities: PlannedMealParticipant[],
  ) {}

  static create(input: PlannedMealInput): PlannedMeal {
    validateSource(input.source, input.recipeId, input.previousMealId);
    if (!Number.isInteger(input.position) || input.position < 0)
      throw new InvalidMealPlanningError('Meal position must be a non-negative integer.');
    return new PlannedMeal(
      {
        id: PlannedMealId.from(input.id).value,
        date: new Date(input.date),
        type: input.type,
        source: input.source,
        recipeId: input.recipeId?.trim() || null,
        nameSnapshot: input.nameSnapshot?.trim() || null,
        notes: input.notes?.trim() || null,
        nutritionSnapshot: input.nutritionSnapshot ?? null,
        status: PlannedMealStatus.PLANNED,
        participants: [],
        position: input.position,
        replacedMealId: input.replacedMealId?.trim() || null,
        preparedBatchId: input.preparedBatchId?.trim() || null,
        mealId: input.mealId?.trim() || null,
        previousMealId: input.previousMealId?.trim() || null,
        createdAt: new Date(input.occurredAt),
        updatedAt: new Date(input.occurredAt),
      },
      [],
    );
  }

  static reconstitute(props: PlannedMealProps): PlannedMeal {
    return new PlannedMeal(
      {
        ...props,
        date: new Date(props.date),
        createdAt: new Date(props.createdAt),
        updatedAt: new Date(props.updatedAt),
      },
      props.participants.map((participant) => PlannedMealParticipant.reconstitute(participant)),
    );
  }

  get id(): string {
    return this.props.id;
  }
  get date(): Date {
    return new Date(this.props.date);
  }
  get source(): PlannedMealSource {
    return this.props.source;
  }
  get status(): PlannedMealStatus {
    return this.props.status;
  }
  get participants(): PlannedMealParticipantPropsView[] {
    return this.participantEntities.map(toParticipantView);
  }

  update(
    input: Partial<
      Pick<
        PlannedMealInput,
        | 'date'
        | 'type'
        | 'source'
        | 'recipeId'
        | 'nameSnapshot'
        | 'notes'
        | 'nutritionSnapshot'
        | 'preparedBatchId'
        | 'mealId'
        | 'previousMealId'
        | 'position'
      >
    > & { occurredAt: Date },
  ): void {
    this.ensureEditable();
    const source = input.source ?? this.props.source;
    const recipeId = input.recipeId === undefined ? this.props.recipeId : input.recipeId;
    const sourceChanged = input.source !== undefined && input.source !== this.props.source;
    const previousMealId =
      input.previousMealId === undefined
        ? sourceChanged && source !== PlannedMealSource.PREVIOUS_MEAL
          ? null
          : this.props.previousMealId
        : input.previousMealId;
    validateSource(source, recipeId, previousMealId);
    if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0))
      throw new InvalidMealPlanningError('Meal position must be a non-negative integer.');
    this.props.type = input.type ?? this.props.type;
    if (input.date !== undefined) this.props.date = new Date(input.date);
    this.props.source = source;
    this.props.recipeId = recipeId?.trim() || null;
    if (input.nameSnapshot !== undefined)
      this.props.nameSnapshot = input.nameSnapshot?.trim() || null;
    if (input.notes !== undefined) this.props.notes = input.notes?.trim() || null;
    if (input.nutritionSnapshot !== undefined)
      this.props.nutritionSnapshot = input.nutritionSnapshot;
    if (input.preparedBatchId !== undefined)
      this.props.preparedBatchId = input.preparedBatchId?.trim() || null;
    if (input.mealId !== undefined) this.props.mealId = input.mealId?.trim() || null;
    if (input.previousMealId !== undefined || sourceChanged)
      this.props.previousMealId = previousMealId?.trim() || null;
    if (input.position !== undefined) this.props.position = input.position;
    this.props.updatedAt = new Date(input.occurredAt);
  }

  assignParticipant(participant: PlannedMealParticipant): void {
    if (
      this.participantEntities.some(
        (current) =>
          current.id === participant.id || current.adultProfileId === participant.adultProfileId,
      )
    )
      throw new InvalidMealPlanningError('Participant is already assigned to this meal.');
    this.ensureEditable();
    this.participantEntities.push(participant);
    this.props.updatedAt = new Date();
  }

  updateParticipant(
    participantId: string,
    input: Parameters<typeof PlannedMealParticipant.prototype.update>[0],
    allowPrepared = false,
  ): void {
    if (allowPrepared) {
      if (![PlannedMealStatus.PLANNED, PlannedMealStatus.PREPARED].includes(this.props.status))
        throw new MealPlanningTransitionError('Only planned or prepared meals can be edited.');
    } else {
      this.ensureEditable();
    }
    const participant = this.participantEntities.find((item) => item.id === participantId);
    if (!participant)
      throw new InvalidMealPlanningError('Participant is not assigned to this meal.');
    participant.update(input);
    this.props.updatedAt = new Date(input.occurredAt);
  }

  removeParticipant(participantId: string): void {
    this.ensureEditable();
    const index = this.participantEntities.findIndex((item) => item.id === participantId);
    if (index < 0) throw new InvalidMealPlanningError('Participant is not assigned to this meal.');
    this.participantEntities.splice(index, 1);
  }

  confirmParticipantQuantity(
    participantId: string,
    quantity: Decimal.Value,
    unit: string,
    actorId: string | Date,
    occurredAt?: Date,
  ): void {
    this.ensureEditable();
    const participant = this.participantEntities.find((item) => item.id === participantId);
    if (!participant)
      throw new InvalidMealPlanningError('Participant is not assigned to this meal.');
    const confirmedAt = occurredAt ?? (actorId instanceof Date ? actorId : new Date());
    const confirmedBy = actorId instanceof Date ? 'legacy' : actorId;
    participant.confirmQuantity(quantity, unit, confirmedBy, confirmedAt);
    this.props.updatedAt = new Date(confirmedAt);
  }

  markPrepared(occurredAt = new Date()): void {
    this.transition(PlannedMealStatus.PLANNED, PlannedMealStatus.PREPARED, occurredAt);
  }
  markServed(occurredAt = new Date()): void {
    this.transition(PlannedMealStatus.PREPARED, PlannedMealStatus.SERVED, occurredAt);
  }
  markConsumed(occurredAt = new Date()): void {
    this.transition(PlannedMealStatus.SERVED, PlannedMealStatus.CONSUMED, occurredAt);
  }
  markConsumedFromPlan(occurredAt = new Date()): void {
    if (
      ![PlannedMealStatus.PLANNED, PlannedMealStatus.PREPARED, PlannedMealStatus.SERVED].includes(
        this.props.status,
      )
    )
      throw new MealPlanningTransitionError('Meal cannot be consumed in its current state.');
    this.props.status = PlannedMealStatus.CONSUMED;
    this.props.updatedAt = new Date(occurredAt);
  }
  consumeParticipant(participantId: string, consumedMealId: string, occurredAt = new Date()): void {
    const participant = this.participantEntities.find((item) => item.id === participantId);
    if (!participant)
      throw new InvalidMealPlanningError('Participant is not assigned to this meal.');
    participant.consume(consumedMealId, occurredAt);
    this.completeParticipantCycle(occurredAt);
    this.props.updatedAt = new Date(occurredAt);
  }
  skipParticipant(participantId: string, occurredAt = new Date()): void {
    const participant = this.participantEntities.find((item) => item.id === participantId);
    if (!participant)
      throw new InvalidMealPlanningError('Participant is not assigned to this meal.');
    participant.skip(occurredAt);
    this.completeParticipantCycle(occurredAt);
    this.props.updatedAt = new Date(occurredAt);
  }

  private completeParticipantCycle(occurredAt: Date): void {
    if (
      !this.participantEntities.every(
        (item) => item.toProps().status !== PlannedMealParticipantStatus.PLANNED,
      )
    )
      return;
    if (
      this.participantEntities.some(
        (item) => item.toProps().status === PlannedMealParticipantStatus.CONSUMED,
      )
    )
      this.markConsumedFromPlan(occurredAt);
    else this.markSkipped(occurredAt);
  }
  linkPreparedBatch(batchId: string, occurredAt = new Date()): void {
    if (this.props.status !== PlannedMealStatus.PLANNED)
      throw new MealPlanningTransitionError('Only planned meals can start preparation.');
    this.props.preparedBatchId = batchId;
    this.props.status = PlannedMealStatus.PREPARED;
    this.props.updatedAt = new Date(occurredAt);
  }
  linkConsumedMeal(mealId: string, occurredAt = new Date()): void {
    if (this.props.mealId)
      throw new MealPlanningTransitionError('Meal already has a consumption linked.');
    this.props.mealId = mealId;
    this.markConsumedFromPlan(occurredAt);
  }
  markSkipped(occurredAt = new Date()): void {
    if (
      ![PlannedMealStatus.PLANNED, PlannedMealStatus.PREPARED, PlannedMealStatus.SERVED].includes(
        this.props.status,
      )
    )
      throw new MealPlanningTransitionError('Meal cannot be skipped in its current state.');
    this.props.status = PlannedMealStatus.SKIPPED;
    this.props.updatedAt = new Date(occurredAt);
  }
  replace(occurredAt = new Date()): void {
    this.transition(PlannedMealStatus.PLANNED, PlannedMealStatus.REPLACED, occurredAt);
  }
  cancel(occurredAt = new Date()): void {
    if (this.props.status === PlannedMealStatus.CONSUMED)
      throw new MealPlanningTransitionError('Consumed meal cannot be removed.');
    this.props.status = PlannedMealStatus.CANCELLED;
    this.props.updatedAt = new Date(occurredAt);
  }

  toProps(): PlannedMealProps {
    return {
      ...this.props,
      date: new Date(this.props.date),
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      participants: this.participantEntities.map((participant) => participant.toProps()),
    };
  }

  private ensureEditable(): void {
    if (this.props.status !== PlannedMealStatus.PLANNED)
      throw new MealPlanningTransitionError('Only planned meals can be edited.');
  }
  private transition(from: PlannedMealStatus, to: PlannedMealStatus, occurredAt: Date): void {
    if (this.props.status !== from)
      throw new MealPlanningTransitionError(`Meal must be ${from} to become ${to}.`);
    this.props.status = to;
    this.props.updatedAt = new Date(occurredAt);
  }
}

export interface PlannedMealParticipantPropsView {
  id: string;
  adultProfileId: string;
  suggestedQuantity: Decimal | null;
  suggestedUnit: string | null;
  confirmedQuantity: Decimal | null;
  confirmedUnit: string | null;
  confirmedById?: string | null;
  confirmedAt?: Date | null;
  confirmationSnapshot?: Record<string, unknown> | null;
  nutritionTargetSnapshot: Record<string, unknown> | null;
  status: PlannedMealParticipantStatus;
  consumedMealId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toParticipantView(participant: PlannedMealParticipant): PlannedMealParticipantPropsView {
  return participant.toProps();
}
function validateSource(
  source: PlannedMealSource,
  recipeId?: string | null,
  previousMealId?: string | null,
): void {
  if (source === PlannedMealSource.RECIPE && !recipeId?.trim())
    throw new InvalidMealPlanningError('Recipe meals require a recipe id.');
  if (source !== PlannedMealSource.RECIPE && recipeId?.trim())
    throw new InvalidMealPlanningError('Only recipe meals can have a recipe id.');
  if (source === PlannedMealSource.PREVIOUS_MEAL && !previousMealId?.trim())
    throw new InvalidMealPlanningError('Previous meal entries require a previous meal id.');
  if (source !== PlannedMealSource.PREVIOUS_MEAL && previousMealId?.trim())
    throw new InvalidMealPlanningError('Only previous meal entries can have a previous meal id.');
}
