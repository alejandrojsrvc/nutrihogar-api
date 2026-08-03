import type { ExportDateRange, ExportQuery } from '../models/export.models';
import { InvalidExportQueryError } from '../errors/export.errors';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toExportDateRange(
  query: ExportQuery,
  fallbackTimezone?: string | null,
): ExportDateRange {
  const timezone = query.timezone ?? fallbackTimezone ?? 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new InvalidExportQueryError('timezone must be a valid IANA timezone.');
  }
  const fromDate = query.dateFrom ?? '1970-01-01';
  const toDate = query.dateTo ?? '9999-12-31';
  if (
    !DATE.test(fromDate) ||
    !DATE.test(toDate) ||
    fromDate >= toDate ||
    !isCalendarDate(fromDate) ||
    !isCalendarDate(toDate)
  )
    throw new InvalidExportQueryError(
      'dateFrom and dateTo must be YYYY-MM-DD with dateFrom before dateTo.',
    );
  if (query.locale) {
    try {
      new Intl.Locale(query.locale);
    } catch {
      throw new InvalidExportQueryError('locale must be a valid locale.');
    }
  }
  return { from: zonedMidnight(fromDate, timezone), to: zonedMidnight(toDate, timezone) };
}

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(`${value}T`);
}

function zonedMidnight(date: string, timezone: string): Date {
  const naive = new Date(`${date}T00:00:00.000Z`);
  let result = naive;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(result);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
    result = new Date(naive.getTime() - (represented - result.getTime()));
  }
  return result;
}
