import { JsonSchema } from '../../../ai/application/ports/structured-content-provider.port';
import { RECEIPT_SCHEMA_VERSION } from '../../application/models/receipt-structured.models';

const nullableString: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableAmount: JsonSchema = { anyOf: [{ type: 'number' }, { type: 'null' }] };

export const RECEIPT_RESPONSE_SCHEMA: JsonSchema = {
  type: 'object',
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
    schema_version: { type: 'string', enum: [RECEIPT_SCHEMA_VERSION] },
    store: {
      type: 'object',
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
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'item_type',
          'description',
          'quantity',
          'unit',
          'unit_price',
          'discount',
          'total',
        ],
        properties: {
          item_type: { type: 'string', enum: ['FOOD', 'NON_FOOD'] },
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
    payment_methods: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    confidence: nullableAmount,
    requires_review: { type: 'boolean' },
  },
};

export const RECEIPT_OCR_SYSTEM_INSTRUCTION = [
  'You extract receipt data from the supplied image or PDF.',
  'Return only one JSON object matching the supplied receipt.v2 schema.',
  'Every property is required. Use null for an unknown scalar and [] for an absent list.',
  'Never infer, invent, translate, round, or silently convert values.',
  'Use numeric JSON values for amounts and quantities, preserving the observed value.',
  'Use an uppercase ISO 4217 currency code when it is printed; otherwise use null.',
  'Use one of GRAM, MILLILITER, UNIT, KG, G, L, ML, or EA for an observed item unit; otherwise use null.',
  'Classify edible grocery products as FOOD and clothing, household goods, services, or other non-edible products as NON_FOOD.',
  'Set warnings for ambiguities and requires_review when the receipt itself is uncertain.',
].join(' ');

export const RECEIPT_OCR_PROMPT = [
  'Read the receipt document and populate every field in the receipt.v2 structured contract.',
  'The date must be YYYY-MM-DD and the time must be HH:mm or HH:mm:ss when present.',
  'Keep discounts and taxes as positive amounts. A missing value is null, not zero.',
  'Do not add an item that is not visible in the document.',
].join(' ');
