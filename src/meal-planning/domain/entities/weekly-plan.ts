import Decimal from 'decimal.js';
import { PlannedMeal } from './planned-meal';
import type { PlannedMealInput } from './planned-meal';
import { PlannedMealParticipant } from './planned-meal-participant';
import {
  InvalidMealPlanningError,
  MealPlanningTransitionError,
} from '../errors/meal-planning.errors';
import type { WeeklyPlanProps } from '../models/meal-planning.models';
import { WeeklyPlanStatus } from '../models/meal-planning.models';
import { PlanningDate, WeekStart } from '../value-objects/planning-date';
import type { CalendarDateInput } from '../value-objects/planning-date';
import { PlannedMealSource, PlannedMealStatus } from '../value-objects/planned-meal';
import { WeeklyPlanId } from '../value-objects/identifiers';

export interface CreateWeeklyPlanInput {
  id: string;
  householdId: string;
  weekStart: CalendarDateInput;
  weeklyBudget?: Decimal.Value | null;
  currency?: string | null;
  createdBy: string;
  createdAt: Date;
}

export class WeeklyPlan {
  private constructor(
    private props: WeeklyPlanProps,
    private readonly mealEntities: PlannedMeal[],
  ) {}

  static create(input: CreateWeeklyPlanInput): WeeklyPlan {
    const start = WeekStart.from(input.weekStart);
    if (!input.householdId.trim() || !input.createdBy.trim())
      throw new InvalidMealPlanningError('Household id and creator are required.');
    const budget = input.weeklyBudget == null ? null : nonNegativeDecimal(input.weeklyBudget);
    return new WeeklyPlan(
      {
        id: WeeklyPlanId.from(input.id).value,
        householdId: input.householdId.trim(),
        weekStart: start.toDate(),
        weekEnd: start.weekEnd().toDate(),
        status: WeeklyPlanStatus.DRAFT,
        weeklyBudget: budget,
        currency: input.currency?.trim() || null,
        createdBy: input.createdBy.trim(),
        createdAt: new Date(input.createdAt),
        updatedAt: new Date(input.createdAt),
        publishedAt: null,
        meals: [],
      },
      [],
    );
  }

  static reconstitute(props: WeeklyPlanProps): WeeklyPlan {
    WeekStart.from(props.weekStart);
    return new WeeklyPlan(
      {
        ...props,
        weekStart: new Date(props.weekStart),
        weekEnd: new Date(props.weekEnd),
        weeklyBudget: props.weeklyBudget && new Decimal(props.weeklyBudget),
        createdAt: new Date(props.createdAt),
        updatedAt: new Date(props.updatedAt),
        publishedAt: props.publishedAt && new Date(props.publishedAt),
        meals: [],
      },
      props.meals.map((meal) => PlannedMeal.reconstitute(meal)),
    );
  }

  get id(): string {
    return this.props.id;
  }
  get householdId(): string {
    return this.props.householdId;
  }
  get status(): WeeklyPlanStatus {
    return this.props.status;
  }
  get currency(): string | null {
    return this.props.currency;
  }
  get weekStart(): Date {
    return new Date(this.props.weekStart);
  }
  get weekEnd(): Date {
    return new Date(this.props.weekEnd);
  }
  get meals(): ReturnType<PlannedMeal['toProps']>[] {
    return this.mealEntities.map((meal) => meal.toProps());
  }

  update(input: {
    weeklyBudget?: Decimal.Value | null;
    currency?: string | null;
    occurredAt: Date;
  }): void {
    this.ensureDraft();
    if (input.weeklyBudget !== undefined)
      this.props.weeklyBudget =
        input.weeklyBudget == null ? null : nonNegativeDecimal(input.weeklyBudget);
    if (input.currency !== undefined) this.props.currency = input.currency?.trim() || null;
    this.touch(input.occurredAt);
  }

  addMeal(input: Omit<PlannedMealInput, 'date'> & { date: CalendarDateInput }): void {
    this.ensureDraft();
    const date = PlanningDate.from(input.date);
    if (
      !date.isBetween(
        PlanningDate.from(this.props.weekStart),
        PlanningDate.from(this.props.weekEnd),
      )
    )
      throw new InvalidMealPlanningError('Meal date must belong to the plan week.');
    if (this.hasPosition(date.toString(), input.position))
      throw new InvalidMealPlanningError('Meal position is already used on this date.');
    this.mealEntities.push(PlannedMeal.create({ ...input, date: date.toDate() }));
    this.touch(input.occurredAt);
  }

  updateMeal(mealId: string, input: Parameters<PlannedMeal['update']>[0]): void {
    this.ensureDraft();
    const meal = this.requireMeal(mealId);
    const date =
      input.date === undefined ? this.dateOf(meal) : PlanningDate.from(input.date).toString();
    if (
      !PlanningDate.from(date).isBetween(
        PlanningDate.from(this.props.weekStart),
        PlanningDate.from(this.props.weekEnd),
      )
    )
      throw new InvalidMealPlanningError('Meal date must belong to the plan week.');
    if (input.position !== undefined && this.hasPosition(date, input.position, meal.id))
      throw new InvalidMealPlanningError('Meal position is already used on this date.');
    meal.update(input);
    this.touch(input.occurredAt);
  }

  removeMeal(mealId: string, occurredAt = new Date()): void {
    this.ensureDraft();
    this.requireMeal(mealId).cancel(occurredAt);
    this.touch(occurredAt);
  }

  assignParticipant(
    mealId: string,
    input: Parameters<typeof PlannedMealParticipant.create>[0],
  ): void {
    this.ensureDraft();
    const participant = PlannedMealParticipant.create(input);
    this.requireMeal(mealId).assignParticipant(participant);
    this.touch(input.occurredAt);
  }

  confirmParticipantQuantity(
    mealId: string,
    participantId: string,
    quantity: Decimal.Value,
    unit: string,
    occurredAt = new Date(),
  ): void {
    this.ensureDraft();
    this.requireMeal(mealId).confirmParticipantQuantity(participantId, quantity, unit, occurredAt);
    this.touch(occurredAt);
  }

  updateParticipant(
    mealId: string,
    participantId: string,
    input: Parameters<PlannedMeal['updateParticipant']>[1],
  ): void {
    this.ensureDraft();
    this.requireMeal(mealId).updateParticipant(participantId, input);
    this.touch(input.occurredAt);
  }

  removeParticipant(mealId: string, participantId: string): void {
    this.ensureDraft();
    this.requireMeal(mealId).removeParticipant(participantId);
    this.touch(new Date());
  }

  replaceMeal(
    mealId: string,
    input: Omit<PlannedMealInput, 'date' | 'type' | 'position'> & {
      date?: CalendarDateInput;
      type?: PlannedMealInput['type'];
      position?: number;
    },
  ): void {
    this.ensureDraft();
    const oldMeal = this.requireMeal(mealId);
    if (oldMeal.status !== PlannedMealStatus.PLANNED)
      throw new MealPlanningTransitionError('Only planned meals can be replaced.');
    const old = oldMeal.toProps();
    const date = PlanningDate.from(input.date ?? old.date);
    if (
      !date.isBetween(
        PlanningDate.from(this.props.weekStart),
        PlanningDate.from(this.props.weekEnd),
      )
    )
      throw new InvalidMealPlanningError('Meal date must belong to the plan week.');
    oldMeal.replace(input.occurredAt);
    this.mealEntities.push(
      PlannedMeal.create({
        ...input,
        date: date.toDate(),
        type: input.type ?? old.type,
        position: input.position ?? old.position,
        replacedMealId: old.id,
      }),
    );
    this.touch(input.occurredAt);
  }

  activate(occurredAt = new Date()): void {
    if (this.props.status !== WeeklyPlanStatus.DRAFT)
      throw new MealPlanningTransitionError('Only draft plans can be activated.');
    for (const meal of this.mealEntities) {
      if (
        meal.status === PlannedMealStatus.PLANNED &&
        meal.source !== PlannedMealSource.EMPTY &&
        !meal.participants.length
      )
        throw new MealPlanningTransitionError('Every active meal must have a participant.');
    }
    this.props.status = WeeklyPlanStatus.ACTIVE;
    this.props.publishedAt = new Date(occurredAt);
    this.touch(occurredAt);
  }

  complete(occurredAt = new Date()): void {
    if (this.props.status !== WeeklyPlanStatus.ACTIVE)
      throw new MealPlanningTransitionError('Only active plans can be completed.');
    this.props.status = WeeklyPlanStatus.COMPLETED;
    this.touch(occurredAt);
  }

  cancel(occurredAt = new Date()): void {
    if ([WeeklyPlanStatus.COMPLETED, WeeklyPlanStatus.CANCELLED].includes(this.props.status))
      throw new MealPlanningTransitionError('Completed or cancelled plans cannot be cancelled.');
    this.props.status = WeeklyPlanStatus.CANCELLED;
    this.touch(occurredAt);
  }

  toProps(): WeeklyPlanProps {
    return {
      ...this.props,
      weekStart: new Date(this.props.weekStart),
      weekEnd: new Date(this.props.weekEnd),
      weeklyBudget: this.props.weeklyBudget && new Decimal(this.props.weeklyBudget),
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      publishedAt: this.props.publishedAt && new Date(this.props.publishedAt),
      meals: this.mealEntities.map((meal) => meal.toProps()),
    };
  }

  private ensureDraft(): void {
    if (this.props.status !== WeeklyPlanStatus.DRAFT)
      throw new MealPlanningTransitionError('Only draft plans can be edited.');
  }
  private requireMeal(id: string): PlannedMeal {
    const meal = this.mealEntities.find((item) => item.id === id);
    if (!meal) throw new InvalidMealPlanningError('Planned meal was not found.');
    return meal;
  }
  private dateOf(meal: PlannedMeal): string {
    return meal.date.toISOString().slice(0, 10);
  }
  private hasPosition(date: string, position: number, exceptId?: string): boolean {
    return this.mealEntities.some(
      (meal) =>
        meal.id !== exceptId &&
        this.dateOf(meal) === date &&
        meal.toProps().position === position &&
        ![PlannedMealStatus.CANCELLED, PlannedMealStatus.REPLACED].includes(meal.status),
    );
  }
  private touch(at: Date): void {
    this.props.updatedAt = new Date(at);
  }
}

function nonNegativeDecimal(value: Decimal.Value): Decimal {
  let amount: Decimal;
  try {
    amount = new Decimal(value);
  } catch {
    throw new InvalidMealPlanningError('Budget must be a finite decimal.');
  }
  if (!amount.isFinite() || amount.isNegative())
    throw new InvalidMealPlanningError('Budget cannot be negative.');
  return amount;
}
