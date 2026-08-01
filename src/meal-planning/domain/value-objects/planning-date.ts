import { InvalidMealPlanningError } from '../errors/meal-planning.errors';

export type CalendarDateInput = string | Date;

export class PlanningDate {
  protected constructor(private readonly date: Date) {}

  static from(value: CalendarDateInput): PlanningDate {
    const date = calendarDate(value);
    return new PlanningDate(date);
  }

  toDate(): Date {
    return new Date(this.date);
  }

  toString(): string {
    return this.date.toISOString().slice(0, 10);
  }

  isBetween(start: PlanningDate, end: PlanningDate): boolean {
    return this.date >= start.date && this.date <= end.date;
  }
}

export class WeekStart extends PlanningDate {
  private constructor(date: Date) {
    super(date);
  }

  static from(value: CalendarDateInput): WeekStart {
    const date = calendarDate(value);
    if (date.getUTCDay() !== 1) throw new InvalidMealPlanningError('Week start must be a Monday.');
    return new WeekStart(date);
  }

  static normalize(value: CalendarDateInput): WeekStart {
    const date = calendarDate(value);
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    return new WeekStart(date);
  }

  weekEnd(): PlanningDate {
    const end = this.toDate();
    end.setUTCDate(end.getUTCDate() + 6);
    return PlanningDate.from(end);
  }
}

function calendarDate(value: CalendarDateInput): Date {
  let date: Date;
  if (typeof value === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new InvalidMealPlanningError('Date must use YYYY-MM-DD format.');
    date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) !== value)
      throw new InvalidMealPlanningError('Date is invalid.');
  } else {
    date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
  }
  if (Number.isNaN(date.getTime())) throw new InvalidMealPlanningError('Date is invalid.');
  return date;
}
