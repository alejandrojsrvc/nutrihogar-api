import { ReceiptStructuredPayload } from '../models/receipt-structured.models';

export const RECEIPT_OCR = Symbol('RECEIPT_OCR');

export interface ReceiptOcrItem {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string | null;
  discount: string | null;
  total: string | null;
  confidence: number | null;
  needsReview: boolean;
}

export interface ReceiptOcrResult {
  provider: string;
  schemaVersion: string | null;
  structuredPayload: ReceiptStructuredPayload | null;
  storeName: string;
  purchaseDate: Date;
  total: string;
  currency: string;
  confidence: number | null;
  warnings: string[];
  items: ReceiptOcrItem[];
  providerDocumentId: string | null;
  reviewRequired: boolean;
}

export interface ReceiptOcrPort {
  process(input: {
    fileUrl: string;
    fileName: string;
    contentType: string;
    content: Buffer;
    currencyHint?: string;
    locale?: string;
  }): Promise<ReceiptOcrResult>;
}
