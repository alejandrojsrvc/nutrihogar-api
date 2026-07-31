import { InvalidMealDateRangeError } from '../errors/meal-application.errors';

export interface LocalMealDateRange {
  dateFrom?: string;
  dateTo?: string;
}

export interface UtcMealDateRange {
  dateFrom?: Date;
  dateTo?: Date;
}

export function toUtcMealDateRange(range: LocalMealDateRange, timezone: string): UtcMealDateRange {
  if (!range.dateFrom && !range.dateTo) return {};

  try {
    const dateFrom = range.dateFrom ? localDateStartAsUtc(range.dateFrom, timezone) : undefined;
    const dateTo = range.dateTo
      ? localDateStartAsUtc(addOneDay(range.dateTo), timezone)
      : undefined;
    if (dateFrom && dateTo && dateFrom >= dateTo) throw new InvalidMealDateRangeError();

    return { dateFrom, dateTo };
  } catch (error) {
    if (error instanceof InvalidMealDateRangeError) throw error;
    throw new InvalidMealDateRangeError();
  }
}

function localDateStartAsUtc(date: string, timezone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new InvalidMealDateRangeError();
  const [year, month, day] = date.split('-').map(Number);
  ensureCalendarDate(year, month, day);
  const utcGuess = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(utcGuess)).map(({ type, value }) => [type, value]),
  );
  const localAtGuess = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return new Date(utcGuess - (localAtGuess - utcGuess));
}

function addOneDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  ensureCalendarDate(year, month, day);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

function ensureCalendarDate(year: number, month: number, day: number): void {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new InvalidMealDateRangeError();
  }
}
