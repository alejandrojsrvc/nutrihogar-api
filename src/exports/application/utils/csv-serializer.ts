import type { CsvDocument } from '../models/export.models';

export class CsvSerializer {
  static serialize(document: CsvDocument): string {
    return (
      [document.headers, ...document.rows]
        .map((row) => row.map((value) => escapeCell(value)).join(','))
        .join('\r\n') + '\r\n'
    );
  }
}

function escapeCell(value: unknown): string {
  const text = toText(value);
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value) ?? '';
}
