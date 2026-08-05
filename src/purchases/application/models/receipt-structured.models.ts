import { GeminiJsonSchema } from '../../../gemini/application/ports/gemini-content.port';

export const RECEIPT_SCHEMA_VERSION = 'receipt.v1' as const;

export interface ReceiptStructuredStore {
  name: string | null;
  branch: string | null;
  cuit: string | null;
}

export interface ReceiptStructuredItem {
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  discount: number | null;
  total: number | null;
}

export interface ReceiptStructuredPayload {
  schema_version: typeof RECEIPT_SCHEMA_VERSION;
  store: ReceiptStructuredStore;
  date: string | null;
  time: string | null;
  ticket_number: string | null;
  currency: string | null;
  items: ReceiptStructuredItem[];
  subtotal: number | null;
  discounts: number | null;
  taxes: number | null;
  total: number | null;
  payment_methods: string[];
  warnings: string[];
  confidence: number | null;
  requires_review: boolean;
}

const nullableString = { type: 'STRING', nullable: true } as const;
const nullableAmount = { type: 'NUMBER', nullable: true } as const;

export const RECEIPT_RESPONSE_SCHEMA: GeminiJsonSchema = {
  type: 'OBJECT',
  additionalProperties: false,
  required: [
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
  ],
  properties: {
    schema_version: { type: 'STRING', enum: [RECEIPT_SCHEMA_VERSION] },
    store: {
      type: 'OBJECT',
      additionalProperties: false,
      required: ['name', 'branch', 'cuit'],
      properties: {
        name: nullableString,
        branch: nullableString,
        cuit: nullableString,
      },
    },
    date: nullableString,
    time: nullableString,
    ticket_number: nullableString,
    currency: nullableString,
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        additionalProperties: false,
        required: ['description', 'quantity', 'unit', 'unit_price', 'discount', 'total'],
        properties: {
          description: nullableString,
          quantity: nullableAmount,
          unit: nullableString,
          unit_price: nullableAmount,
          discount: nullableAmount,
          total: nullableAmount,
        },
      },
    },
    subtotal: nullableAmount,
    discounts: nullableAmount,
    taxes: nullableAmount,
    total: nullableAmount,
    payment_methods: { type: 'ARRAY', items: { type: 'STRING' } },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: { type: 'NUMBER', nullable: true },
    requires_review: { type: 'BOOLEAN' },
  },
};

export const RECEIPT_OCR_SYSTEM_INSTRUCTION = [
  'You extract receipt data from the supplied image or PDF.',
  'Return only one JSON object matching the supplied receipt.v1 schema.',
  'Every property is required. Use null for an unknown scalar and [] for an absent list.',
  'Never infer, invent, translate, round, or silently convert values.',
  'Use numeric JSON values for amounts and quantities, preserving the observed value.',
  'Use an uppercase ISO 4217 currency code when it is printed; otherwise use null.',
  'Use one of GRAM, MILLILITER, UNIT, KG, G, L, ML, or EA for an observed item unit; otherwise use null.',
  'Set warnings for ambiguities and requires_review when the receipt itself is uncertain.',
].join(' ');

export const RECEIPT_OCR_PROMPT = [
  'Read the receipt document and populate every field in the receipt.v1 structured contract.',
  'The date must be YYYY-MM-DD and the time must be HH:mm or HH:mm:ss when present.',
  'Keep discounts and taxes as positive amounts. A missing value is null, not zero.',
  'Do not add an item that is not visible in the document.',
].join(' ');
