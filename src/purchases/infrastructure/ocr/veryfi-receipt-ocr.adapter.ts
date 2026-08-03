import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReceiptOcrPort, ReceiptOcrResult } from '../../application/ports/receipt-ocr.port';
import {
  ReceiptOcrConfigurationError,
  ReceiptOcrProcessingError,
} from '../../application/errors/receipt-ocr.errors';

@Injectable()
export class VeryfiReceiptOcrAdapter implements ReceiptOcrPort {
  constructor(private readonly config: ConfigService) {}

  async process(input: {
    fileUrl: string;
    fileName: string;
    contentType: string;
  }): Promise<ReceiptOcrResult> {
    const clientId = this.config.get<string>('VERYFI_CLIENT_ID');
    const apiKey = this.config.get<string>('VERYFI_CLIENT_API_KEY');
    if (!clientId || !apiKey) throw new ReceiptOcrConfigurationError();
    const baseUrl = (
      this.config.get<string>('VERYFI_BASE_URL') ?? 'https://api.veryfi.com'
    ).replace(/\/+$/, '');
    const timeout = Number(this.config.get<string>('VERYFI_TIMEOUT_MS') ?? 120000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v8/partner/documents`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Client-Id': clientId,
          Authorization: apiKey,
        },
        body: JSON.stringify({
          file_url: input.fileUrl,
          file_name: input.fileName,
          file_type: input.contentType,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new ReceiptOcrProcessingError('Receipt OCR timed out.');
      throw new ReceiptOcrProcessingError('Veryfi could not be reached.');
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 429)
      throw new ReceiptOcrProcessingError('Receipt OCR rate limit reached.');
    if (!response.ok)
      throw new ReceiptOcrProcessingError(`Veryfi returned HTTP ${response.status}.`);
    return mapVeryfiResult((await response.json()) as Record<string, unknown>);
  }
}

function mapVeryfiResult(value: Record<string, unknown>): ReceiptOcrResult {
  const vendor = asRecord(value.vendor);
  const rawItems = Array.isArray(value.line_items) ? value.line_items : [];
  const warnings: string[] = [];
  const storeName = stringValue(vendor.name) ?? stringValue(value.vendor_name) ?? 'Unknown store';
  const rawDate = stringValue(value.date) ?? stringValue(value.document_date);
  const purchaseDate = rawDate ? new Date(rawDate) : new Date();
  if (!rawDate || Number.isNaN(purchaseDate.getTime()))
    warnings.push('Purchase date needs review.');
  const rawTotal = numberValue(value.total);
  if (rawTotal === null) warnings.push('Purchase total needs review.');
  const items = rawItems.flatMap((raw) => {
    const item = asRecord(raw);
    const name = stringValue(item.description) ?? stringValue(item.name);
    if (!name) return [];
    const quantity = numberValue(item.quantity) ?? 1;
    const confidence = numberValue(item.confidence);
    const unit = stringValue(item.unit_of_measure) ?? 'UNIT';
    return [
      {
        name,
        quantity: String(quantity),
        unit,
        confidence,
        needsReview: confidence !== null && confidence < 0.75,
      },
    ];
  });
  if (items.length === 0) warnings.push('At least one purchase item needs to be added.');
  return {
    storeName,
    purchaseDate: Number.isNaN(purchaseDate.getTime()) ? new Date() : purchaseDate,
    total: String(rawTotal ?? 0),
    currency: stringValue(value.currency_code) ?? stringValue(value.currency) ?? 'USD',
    confidence: numberValue(value.confidence),
    warnings,
    items,
    providerDocumentId: stringValue(value.id) ?? null,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function numberValue(value: unknown): number | null {
  const number =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}
