import crypto from 'node:crypto';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PurchaseRepository } from '../ports/purchase-repository.port';
import { CreatePurchaseUseCase } from './purchase.use-cases';
import { ReceiptOcrPort, ReceiptOcrResult, ReceiptStorage } from '../ports/receipt-ocr.port';
import { Purchase } from '../../domain/entities/purchase';
import { ReceiptOcrDataError, ReceiptOcrFileError } from '../errors/receipt-ocr.errors';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

export class CreatePurchaseDraftFromReceiptUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
    private readonly createPurchase: CreatePurchaseUseCase,
    private readonly ocr: ReceiptOcrPort,
    private readonly storage: ReceiptStorage,
  ) {}

  async execute(input: {
    actorId: string;
    householdId: string;
    content: Buffer;
    fileName: string;
    contentType: string;
    currency?: string;
    idempotencyKey?: string;
  }): Promise<{ purchase: Purchase; ocr: ReceiptOcrResult }> {
    const access = await this.households.findAccess(input.actorId, input.householdId);
    if (!access || access.status !== 'ACTIVE')
      throw new ReceiptOcrFileError('Household access denied.');
    validateFile(input.content, input.fileName, input.contentType);
    const key =
      input.idempotencyKey?.trim() ||
      crypto.createHash('sha256').update(input.content).digest('hex');
    const existing = this.purchases.findByIdempotencyKey
      ? await this.purchases.findByIdempotencyKey(input.householdId, key)
      : null;
    if (existing) {
      return {
        purchase: existing,
        ocr: {
          storeName: existing.storeName,
          purchaseDate: existing.purchaseDate,
          total: existing.total.toString(),
          currency: existing.currency,
          confidence: null,
          warnings: ['An existing draft was returned for this document.'],
          items: existing.items.map((item) => ({
            name: item.nameSnapshot,
            quantity: item.quantity.toString(),
            unit: item.unit,
            confidence: null,
            needsReview: false,
          })),
          providerDocumentId: null,
        },
      };
    }

    const stored = await this.storage.upload({
      content: input.content,
      contentType: input.contentType,
      fileName: input.fileName,
    });
    let result: ReceiptOcrResult;
    try {
      result = await this.ocr.process({
        fileUrl: stored.url,
        fileName: input.fileName,
        contentType: input.contentType,
      });
    } finally {
      await this.storage.remove(stored.path);
    }
    if (result.items.length === 0)
      throw new ReceiptOcrDataError('The receipt contains no purchase items.');

    const purchase = await this.createPurchase.execute({
      actorId: input.actorId,
      householdId: input.householdId,
      storeName: result.storeName,
      purchaseDate: result.purchaseDate,
      total: result.total,
      currency: input.currency?.trim() || result.currency,
      source: 'OCR',
      idempotencyKey: key,
      items: result.items.map((item) => ({
        nameSnapshot: item.name,
        unit: item.unit,
        quantity: item.quantity,
      })),
    });
    return { purchase, ocr: result };
  }
}

function validateFile(content: Buffer, fileName: string, contentType: string): void {
  if (!content?.length || content.length < 250)
    throw new ReceiptOcrFileError('Receipt file must be at least 250 bytes.');
  if (content.length > MAX_FILE_SIZE)
    throw new ReceiptOcrFileError('Receipt file cannot exceed 20 MB.');
  if (!ALLOWED_TYPES.has(contentType))
    throw new ReceiptOcrFileError('Unsupported receipt file type.');
  if (!fileName.trim()) throw new ReceiptOcrFileError('Receipt file name is required.');
}
