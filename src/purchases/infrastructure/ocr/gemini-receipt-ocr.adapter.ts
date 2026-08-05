import {
  GeminiContentConfigurationError,
  GeminiContentProcessingError,
} from '../../../gemini/application/errors/gemini-content.errors';
import { GeminiContentClient } from '../../../gemini/application/ports/gemini-content.port';
import {
  ReceiptOcrConfigurationError,
  ReceiptOcrProcessingError,
} from '../../application/errors/receipt-ocr.errors';
import { ReceiptOcrPort, ReceiptOcrResult } from '../../application/ports/receipt-ocr.port';
import {
  RECEIPT_OCR_PROMPT,
  RECEIPT_OCR_SYSTEM_INSTRUCTION,
  RECEIPT_RESPONSE_SCHEMA,
} from '../../application/models/receipt-structured.models';
import {
  mapReceiptToOcrResult,
  parseReceiptStructuredPayload,
} from './receipt-structured.validator';

export interface GeminiReceiptOcrOptions {
  model?: string;
  timeoutMs?: number;
}

export class GeminiReceiptOcrAdapter implements ReceiptOcrPort {
  constructor(
    private readonly client: GeminiContentClient,
    private readonly options: GeminiReceiptOcrOptions = {},
  ) {}

  async process(input: {
    fileUrl: string;
    fileName: string;
    contentType: string;
    content: Buffer;
    currencyHint?: string;
    locale?: string;
  }): Promise<ReceiptOcrResult> {
    let structuredContent: string;
    try {
      structuredContent = await this.client.generateStructuredContent({
        model: this.options.model ?? 'gemini-2.5-flash',
        timeoutMs: this.options.timeoutMs ?? 120000,
        systemInstruction: RECEIPT_OCR_SYSTEM_INSTRUCTION,
        prompt: `${RECEIPT_OCR_PROMPT} Source file name: ${input.fileName}. Locale hint: ${input.locale ?? 'unknown'}. Currency hint: ${input.currencyHint ?? 'unknown'}.`,
        media: { mimeType: input.contentType, bytes: input.content },
        responseSchema: RECEIPT_RESPONSE_SCHEMA,
      });
    } catch (error) {
      if (error instanceof GeminiContentConfigurationError)
        throw new ReceiptOcrConfigurationError();
      if (error instanceof GeminiContentProcessingError)
        throw new ReceiptOcrProcessingError(error.message);
      throw new ReceiptOcrProcessingError('Gemini receipt OCR could not be completed.');
    }

    return mapReceiptToOcrResult(
      parseReceiptStructuredPayload(structuredContent),
      input.currencyHint,
    );
  }
}
