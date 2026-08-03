export const RECEIPT_OCR = Symbol('RECEIPT_OCR');
export const RECEIPT_STORAGE = Symbol('RECEIPT_STORAGE');

export interface ReceiptOcrItem {
  name: string;
  quantity: string;
  unit: string;
  confidence: number | null;
  needsReview: boolean;
}

export interface ReceiptOcrResult {
  storeName: string;
  purchaseDate: Date;
  total: string;
  currency: string;
  confidence: number | null;
  warnings: string[];
  items: ReceiptOcrItem[];
  providerDocumentId: string | null;
}

export interface ReceiptOcrPort {
  process(input: {
    fileUrl: string;
    fileName: string;
    contentType: string;
  }): Promise<ReceiptOcrResult>;
}

export interface ReceiptStorage {
  upload(input: {
    content: Buffer;
    contentType: string;
    fileName: string;
  }): Promise<{ path: string; url: string }>;
  remove(path: string): Promise<void>;
}
