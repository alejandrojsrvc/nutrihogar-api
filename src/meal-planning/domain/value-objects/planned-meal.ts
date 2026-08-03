import Decimal from 'decimal.js';
import { InvalidMealPlanningError } from '../errors/meal-planning.errors';

export enum PlannedMealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export enum PlannedMealStatus {
  PLANNED = 'PLANNED',
  PREPARED = 'PREPARED',
  SERVED = 'SERVED',
  CONSUMED = 'CONSUMED',
  SKIPPED = 'SKIPPED',
  REPLACED = 'REPLACED',
  CANCELLED = 'CANCELLED',
}

export enum PlannedMealSource {
  RECIPE = 'RECIPE',
  PREVIOUS_MEAL = 'PREVIOUS_MEAL',
  FREE_MEAL = 'FREE_MEAL',
  RESTAURANT = 'RESTAURANT',
  DELIVERY = 'DELIVERY',
  UNPLANNED = 'UNPLANNED',
  EMPTY = 'EMPTY',
}

export class PlannedQuantity {
  private constructor(
    private readonly amount: Decimal,
    readonly unit: string,
  ) {}

  static from(value: Decimal.Value, unit: string): PlannedQuantity {
    let amount: Decimal;
    try {
      amount = new Decimal(value);
    } catch {
      throw new InvalidMealPlanningError('Quantity must be a finite positive decimal.');
    }
    const normalizedUnit = unit.trim();
    if (!amount.isFinite() || amount.lte(0) || !normalizedUnit)
      throw new InvalidMealPlanningError('Quantity must be a finite positive decimal with a unit.');
    return new PlannedQuantity(amount, normalizedUnit);
  }

  toDecimal(): Decimal {
    return new Decimal(this.amount);
  }
}
