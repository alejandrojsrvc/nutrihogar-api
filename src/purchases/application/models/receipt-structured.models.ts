export const RECEIPT_SCHEMA_VERSION = 'receipt.v2' as const;
export const RECEIPT_LEGACY_SCHEMA_VERSION = 'receipt.v1' as const;

export type ReceiptSchemaVersion =
  typeof RECEIPT_SCHEMA_VERSION | typeof RECEIPT_LEGACY_SCHEMA_VERSION;
export type ReceiptItemType = 'FOOD' | 'NON_FOOD';

export interface ReceiptStructuredStore {
  name: string | null;
  branch: string | null;
  cuit: string | null;
}

export interface ReceiptStructuredItem {
  item_type: ReceiptItemType;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  discount: number | null;
  total: number | null;
}

export interface ReceiptStructuredPayload {
  schema_version: ReceiptSchemaVersion;
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
