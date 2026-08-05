import {
  StructuredContentConfigurationError,
  StructuredContentProcessingError,
} from '../../../ai/application/errors/structured-content.errors';
import { StructuredContentProvider } from '../../../ai/application/ports/structured-content-provider.port';
import {
  ReceiptOcrConfigurationError,
  ReceiptOcrProcessingError,
} from '../../application/errors/receipt-ocr.errors';
import { ReceiptOcrPort, ReceiptOcrResult } from '../../application/ports/receipt-ocr.port';
import {
  RECEIPT_OCR_PROMPT,
  RECEIPT_OCR_SYSTEM_INSTRUCTION,
  RECEIPT_RESPONSE_SCHEMA,
} from './receipt-structured-schema';
import {
  mapReceiptToOcrResult,
  parseReceiptStructuredPayload,
} from './receipt-structured.validator';

export interface StructuredReceiptOcrOptions {
  model: string;
  timeoutMs?: number;
  provider: string;
}

export class StructuredReceiptOcrAdapter implements ReceiptOcrPort {
  constructor(
    private readonly provider: StructuredContentProvider,
    private readonly options: StructuredReceiptOcrOptions,
  ) {}

  async process(input: {
    fileUrl: string;
    fileName: string;
    contentType: string;
    content: Buffer;
    currencyHint?: string;
    locale?: string;
  }): Promise<ReceiptOcrResult> {
    if (!this.options.model.trim() || !this.options.provider.trim())
      throw new ReceiptOcrConfigurationError();
    let structuredContent: string;
    try {
      structuredContent = await this.provider.generateStructuredContent({
        model: this.options.model,
        timeoutMs: this.options.timeoutMs ?? 120000,
        systemInstruction: RECEIPT_OCR_SYSTEM_INSTRUCTION,
        prompt: `${RECEIPT_OCR_PROMPT} Source file name: ${input.fileName}. Locale hint: ${input.locale ?? 'unknown'}. Currency hint: ${input.currencyHint ?? 'unknown'}.`,
        media: { mimeType: input.contentType, bytes: input.content },
        responseSchema: RECEIPT_RESPONSE_SCHEMA,
      });
    } catch (error) {
      if (error instanceof StructuredContentConfigurationError)
        throw new ReceiptOcrConfigurationError();
      if (error instanceof StructuredContentProcessingError)
        throw new ReceiptOcrProcessingError(error.message);
      throw new ReceiptOcrProcessingError('Structured receipt OCR could not be completed.');
    }

    return mapReceiptToOcrResult(
      parseReceiptStructuredPayload(structuredContent),
      input.currencyHint,
      this.options.provider,
    );
  }
}
