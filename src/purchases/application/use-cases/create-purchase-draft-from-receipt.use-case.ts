import crypto from 'node:crypto';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import {
  ObjectStorage,
  StoredObject,
} from '../../../storage/application/ports/object-storage.port';
import { PurchaseRepository } from '../ports/purchase-repository.port';
import { CreatePurchaseUseCase } from './purchase.use-cases';
import { ReceiptOcrPort, ReceiptOcrResult } from '../ports/receipt-ocr.port';
import { Purchase } from '../../domain/entities/purchase';
import { ReceiptOcrDataError, ReceiptOcrFileError } from '../errors/receipt-ocr.errors';

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const SIGNED_URL_EXPIRATION_SECONDS = 600;
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
    private readonly storage: ObjectStorage,
    private readonly maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
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
    validateFile(input.content, input.fileName, input.contentType, this.maxFileSizeBytes);
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      crypto.createHash('sha256').update(input.content).digest('hex');
    const existing = this.purchases.findByIdempotencyKey
      ? await this.purchases.findByIdempotencyKey(input.householdId, idempotencyKey)
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

    const objectKey = createReceiptKey(input.householdId, input.contentType);
    let stored: StoredObject | undefined;
    let result: ReceiptOcrResult;
    try {
      stored = await this.storage.upload({
        key: objectKey,
        body: input.content,
        contentType: input.contentType,
        metadata: { 'original-name': encodeURIComponent(input.fileName) },
      });
      const fileUrl = await this.storage.createSignedDownloadUrl(
        stored.key,
        SIGNED_URL_EXPIRATION_SECONDS,
      );
      result = await this.ocr.process({
        fileUrl,
        fileName: input.fileName,
        contentType: input.contentType,
      });
    } finally {
      if (stored) await this.storage.delete(stored.key);
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
      idempotencyKey,
      items: result.items.map((item) => ({
        nameSnapshot: item.name,
        unit: item.unit,
        quantity: item.quantity,
      })),
    });
    return { purchase, ocr: result };
  }
}

function validateFile(
  content: Buffer,
  fileName: string,
  contentType: string,
  maxFileSizeBytes: number,
): void {
  if (!content?.length || content.length < 250)
    throw new ReceiptOcrFileError('Receipt file must be at least 250 bytes.');
  if (content.length > maxFileSizeBytes) {
    const maxSizeMb = Math.floor(maxFileSizeBytes / (1024 * 1024));
    throw new ReceiptOcrFileError(`Receipt file cannot exceed ${maxSizeMb} MB.`);
  }
  if (!ALLOWED_TYPES.has(contentType))
    throw new ReceiptOcrFileError('Unsupported receipt file type.');
  if (!matchesFileSignature(content, contentType))
    throw new ReceiptOcrFileError('Receipt file content does not match its MIME type.');
  if (!fileName.trim()) throw new ReceiptOcrFileError('Receipt file name is required.');
}

function matchesFileSignature(content: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg')
    return content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (contentType === 'image/png')
    return content
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp')
    return (
      content.subarray(0, 4).toString() === 'RIFF' && content.subarray(8, 12).toString() === 'WEBP'
    );
  if (contentType === 'application/pdf') return content.subarray(0, 5).toString() === '%PDF-';
  if (contentType === 'image/heic') {
    const brand = content.subarray(8, 12).toString();
    return (
      content.length >= 12 &&
      content.subarray(4, 8).toString() === 'ftyp' &&
      ['heic', 'heix', 'hevc', 'hevx', 'mif1'].includes(brand)
    );
  }
  return false;
}

function createReceiptKey(householdId: string, contentType: string): string {
  const extension =
    {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'application/pdf': 'pdf',
    }[contentType] ?? 'bin';

  return `households/${encodeURIComponent(householdId)}/receipts/${crypto.randomUUID()}.${extension}`;
}
