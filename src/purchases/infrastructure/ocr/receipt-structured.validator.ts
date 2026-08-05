import Decimal from 'decimal.js';
import { ReceiptOcrDataError } from '../../application/errors/receipt-ocr.errors';
import { ReceiptOcrItem, ReceiptOcrResult } from '../../application/ports/receipt-ocr.port';
import {
  ReceiptStructuredItem,
  ReceiptStructuredPayload,
  RECEIPT_SCHEMA_VERSION,
} from '../../application/models/receipt-structured.models';

const RECEIPT_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RECEIPT_TIME = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const SUPPORTED_UNITS = new Set(['GRAM', 'MILLILITER', 'UNIT', 'KG', 'G', 'L', 'ML', 'EA']);
const REVIEW_CONFIDENCE_THRESHOLD = new Decimal('0.75');
const MONEY_TOLERANCE = new Decimal('0.01');

const RECEIPT_KEYS = [
  'schema_version',
  'store',
  'date',
  'time',
  'ticket_number',
  'currency',
  'items',
  'subtotal',
  'discounts',
  'taxes',
  'total',
  'payment_methods',
  'warnings',
  'confidence',
  'requires_review',
] as const;
const STORE_KEYS = ['name', 'branch', 'cuit'] as const;
const ITEM_KEYS = ['description', 'quantity', 'unit', 'unit_price', 'discount', 'total'] as const;

export function parseReceiptStructuredPayload(text: string): ReceiptStructuredPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new ReceiptOcrDataError('Gemini returned invalid receipt JSON.');
  }
  return readReceipt(parsed);
}

export function mapReceiptToOcrResult(
  payload: ReceiptStructuredPayload,
  currencyHint?: string,
): ReceiptOcrResult {
  const storeName = requiredValue(payload.store.name, 'Receipt store name');
  const currency = requiredCurrency(payload.currency ?? currencyHint ?? null);
  const purchaseDate = toPurchaseDate(payload.date, payload.time);
  const total = requiredAmount(payload.total, 'Receipt total');
  if (payload.items.length === 0)
    throw new ReceiptOcrDataError('The receipt contains no purchase items.');

  const items = payload.items.map((item) => mapItem(item));
  const arithmeticWarnings = findArithmeticWarnings(payload);
  const missingEssentials = payload.items.some(
    (item) => item.total === null || item.unit_price === null,
  );
  const warnings = appendWarnings(payload.warnings, arithmeticWarnings);
  const reviewRequired =
    missingEssentials ||
    payload.confidence === null ||
    new Decimal(payload.confidence).lt(REVIEW_CONFIDENCE_THRESHOLD) ||
    warnings.length > 0;

  return {
    provider: 'GEMINI',
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    structuredPayload: payload,
    storeName,
    purchaseDate,
    total: String(total),
    currency,
    confidence: payload.confidence,
    warnings,
    items,
    providerDocumentId: null,
    reviewRequired,
  };
}

function readReceipt(value: unknown): ReceiptStructuredPayload {
  const record = exactRecord(value, 'Receipt');
  ensureKeys(record, RECEIPT_KEYS, 'Receipt');
  if (record.schema_version !== RECEIPT_SCHEMA_VERSION)
    throw new ReceiptOcrDataError('Receipt schema version is not supported.');

  const store = exactRecord(record.store, 'Receipt store');
  ensureKeys(store, STORE_KEYS, 'Receipt store');
  const items = readItems(record.items);
  const currency = nullableString(record.currency, 'Receipt currency');
  if (currency !== null && !/^[A-Z]{3}$/.test(currency))
    throw new ReceiptOcrDataError('Receipt currency must be an uppercase ISO 4217 code.');

  return {
    schema_version: RECEIPT_SCHEMA_VERSION,
    store: {
      name: nullableString(store.name, 'Receipt store name'),
      branch: nullableString(store.branch, 'Receipt store branch'),
      cuit: nullableString(store.cuit, 'Receipt store CUIT'),
    },
    date: nullableString(record.date, 'Receipt date'),
    time: nullableString(record.time, 'Receipt time'),
    ticket_number: nullableString(record.ticket_number, 'Receipt ticket number'),
    currency,
    items,
    subtotal: nullableAmount(record.subtotal, 'Receipt subtotal'),
    discounts: nullableAmount(record.discounts, 'Receipt discounts'),
    taxes: nullableAmount(record.taxes, 'Receipt taxes'),
    total: nullableAmount(record.total, 'Receipt total'),
    payment_methods: stringArray(record.payment_methods, 'Receipt payment methods'),
    warnings: stringArray(record.warnings, 'Receipt warnings'),
    confidence: confidenceValue(record.confidence),
    requires_review: booleanValue(record.requires_review, 'Receipt requires_review'),
  };
}

function readItems(value: unknown): ReceiptStructuredItem[] {
  if (!Array.isArray(value)) throw new ReceiptOcrDataError('Receipt items must be an array.');
  return value.map((item, index) => {
    const record = exactRecord(item, `Receipt item ${index}`);
    ensureKeys(record, ITEM_KEYS, `Receipt item ${index}`);
    return {
      description: nullableString(record.description, `Receipt item ${index} description`),
      quantity: nullableAmount(record.quantity, `Receipt item ${index} quantity`),
      unit: nullableString(record.unit, `Receipt item ${index} unit`),
      unit_price: nullableAmount(record.unit_price, `Receipt item ${index} unit price`),
      discount: nullableAmount(record.discount, `Receipt item ${index} discount`),
      total: nullableAmount(record.total, `Receipt item ${index} total`),
    };
  });
}

function mapItem(item: ReceiptStructuredItem): ReceiptOcrItem {
  const name = requiredValue(item.description, 'Receipt item description');
  const quantity = requiredAmount(item.quantity, 'Receipt item quantity');
  const unit = requiredValue(item.unit, 'Receipt item unit');
  if (!SUPPORTED_UNITS.has(unit.toUpperCase()))
    throw new ReceiptOcrDataError(`Receipt item unit is not supported: ${unit}.`);
  if (new Decimal(quantity).lte(0))
    throw new ReceiptOcrDataError('Receipt item quantity must be positive.');

  return {
    name,
    quantity: String(quantity),
    unit,
    unitPrice: amountString(item.unit_price),
    discount: amountString(item.discount),
    total: amountString(item.total),
    confidence: null,
    needsReview: item.unit_price === null || item.discount === null || item.total === null,
  };
}

function toPurchaseDate(date: string | null, time: string | null): Date {
  if (date === null) throw new ReceiptOcrDataError('Receipt date is required.');
  const dateMatch = RECEIPT_DATE.exec(date);
  if (!dateMatch) throw new ReceiptOcrDataError('Receipt date must use YYYY-MM-DD.');
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  let hour = 0;
  let minute = 0;
  let second = 0;
  if (time !== null) {
    const timeMatch = RECEIPT_TIME.exec(time);
    if (!timeMatch) throw new ReceiptOcrDataError('Receipt time must use HH:mm or HH:mm:ss.');
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    second = Number(timeMatch[3] ?? 0);
  }
  const result = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    year < 1 ||
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day ||
    result.getUTCHours() !== hour ||
    result.getUTCMinutes() !== minute ||
    result.getUTCSeconds() !== second
  )
    throw new ReceiptOcrDataError('Receipt date or time is invalid.');
  return result;
}

function findArithmeticWarnings(payload: ReceiptStructuredPayload): string[] {
  const warnings: string[] = [];
  for (const [index, item] of payload.items.entries()) {
    if (
      item.quantity !== null &&
      item.unit_price !== null &&
      item.discount !== null &&
      item.total !== null
    ) {
      const expected = new Decimal(item.quantity).times(item.unit_price).minus(item.discount);
      if (differentEnough(expected, new Decimal(item.total)))
        warnings.push(`Receipt item ${index + 1} arithmetic is inconsistent.`);
    }
  }

  if (
    payload.subtotal !== null &&
    payload.items.every((item) => item.total !== null) &&
    differentEnough(
      payload.items.reduce((sum, item) => sum.plus(item.total ?? 0), new Decimal(0)),
      new Decimal(payload.subtotal),
    )
  )
    warnings.push('Receipt subtotal is inconsistent with item totals.');

  if (
    payload.subtotal !== null &&
    payload.discounts !== null &&
    payload.taxes !== null &&
    payload.total !== null &&
    differentEnough(
      new Decimal(payload.subtotal).minus(payload.discounts).plus(payload.taxes),
      new Decimal(payload.total),
    )
  )
    warnings.push('Receipt total is inconsistent with subtotal, discounts, and taxes.');

  return warnings;
}

function differentEnough(left: Decimal, right: Decimal): boolean {
  return left.minus(right).abs().gt(MONEY_TOLERANCE);
}

function appendWarnings(source: string[], additions: string[]): string[] {
  return [...source, ...additions.filter((warning) => !source.includes(warning))];
}

function exactRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ReceiptOcrDataError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function ensureKeys(record: Record<string, unknown>, keys: readonly string[], label: string): void {
  const missing = keys.filter((key) => !Object.prototype.hasOwnProperty.call(record, key));
  if (missing.length > 0)
    throw new ReceiptOcrDataError(
      `${label} is missing required properties: ${missing.join(', ')}.`,
    );
  const unknown = Object.keys(record).filter((key) => !keys.includes(key));
  if (unknown.length > 0)
    throw new ReceiptOcrDataError(
      `${label} contains unsupported properties: ${unknown.join(', ')}.`,
    );
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim())
    throw new ReceiptOcrDataError(`${label} must be a non-empty string or null.`);
  return value;
}

function nullableAmount(value: unknown, label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new ReceiptOcrDataError(`${label} must be a finite non-negative number or null.`);
  return value;
}

function confidenceValue(value: unknown): number | null {
  const confidence = nullableAmount(value, 'Receipt confidence');
  if (confidence !== null && confidence > 1)
    throw new ReceiptOcrDataError('Receipt confidence must be between 0 and 1.');
  return confidence;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new ReceiptOcrDataError(`${label} must be a boolean.`);
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim()))
    throw new ReceiptOcrDataError(`${label} must be an array of non-empty strings.`);
  return value as string[];
}

function requiredValue(value: string | null, label: string): string {
  if (value === null) throw new ReceiptOcrDataError(`${label} is required.`);
  return value;
}

function requiredAmount(value: number | null, label: string): number {
  if (value === null) throw new ReceiptOcrDataError(`${label} is required.`);
  return value;
}

function requiredCurrency(value: string | null): string {
  if (value === null) throw new ReceiptOcrDataError('Receipt currency is required.');
  return value;
}

function amountString(value: number | null): string | null {
  return value === null ? null : String(value);
}
