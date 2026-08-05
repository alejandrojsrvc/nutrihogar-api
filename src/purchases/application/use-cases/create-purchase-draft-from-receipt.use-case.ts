import crypto from 'node:crypto';
import Decimal from 'decimal.js';
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
    locale?: string;
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
      const metadata = existing.ocrMetadata;
      const payload = metadata?.payload as
        | {
            schema_version?: string;
            items?: Array<{
              description: string | null;
              quantity: number | null;
              unit: string | null;
              unit_price: number | null;
              discount: number | null;
              total: number | null;
            }>;
          }
        | undefined;
      return {
        purchase: existing,
        ocr: {
          provider: metadata?.provider ?? 'GEMINI',
          schemaVersion: metadata?.schemaVersion ?? null,
          structuredPayload: metadata?.payload as ReceiptOcrResult['structuredPayload'],
          storeName: existing.storeName,
          purchaseDate: existing.purchaseDate,
          total: existing.total.toString(),
          currency: existing.currency,
          confidence: metadata?.confidence ?? null,
          warnings: [
            ...(metadata?.warnings ?? []),
            'An existing draft was returned for this document.',
          ],
          items: payload?.items?.length
            ? payload.items.map((item) => ({
                name: item.description ?? 'Unknown item',
                quantity: String(item.quantity ?? 0),
                unit: item.unit ?? 'UNIT',
                unitPrice: item.unit_price === null ? null : String(item.unit_price),
                discount: item.discount === null ? null : String(item.discount),
                total: item.total === null ? null : String(item.total),
                confidence: null,
                needsReview:
                  item.description === null || item.quantity === null || item.total === null,
              }))
            : existing.items.map((item) => ({
                name: item.nameSnapshot,
                quantity: item.quantity.toString(),
                unit: item.unit,
                unitPrice: null,
                discount: null,
                total: null,
                confidence: null,
                needsReview: true,
              })),
          providerDocumentId: null,
          reviewRequired: metadata?.requiresReview ?? true,
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
        content: input.content,
        currencyHint: input.currency,
        locale: input.locale,
      });
    } finally {
      if (stored) await this.storage.delete(stored.key);
    }
    validateOcrResult(result);

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
      ocrMetadata: result.structuredPayload
        ? {
            provider: result.provider,
            schemaVersion: result.schemaVersion ?? 'receipt.v1',
            payload: result.structuredPayload as unknown as Record<string, unknown>,
            confidence: result.confidence,
            warnings: result.warnings,
            requiresReview: result.reviewRequired,
          }
        : null,
    });
    return { purchase, ocr: result };
  }
}

function validateOcrResult(result: ReceiptOcrResult): void {
  if (!result || typeof result !== 'object')
    throw new ReceiptOcrDataError('Receipt OCR result is invalid.');
  if (
    typeof result.provider !== 'string' ||
    !result.provider.trim() ||
    result.schemaVersion !== 'receipt.v1'
  )
    throw new ReceiptOcrDataError('Receipt OCR provider data is invalid.');
  if (
    !result.structuredPayload ||
    typeof result.structuredPayload !== 'object' ||
    Array.isArray(result.structuredPayload)
  )
    throw new ReceiptOcrDataError('Receipt OCR payload is missing or invalid.');
  if (!(result.purchaseDate instanceof Date) || Number.isNaN(result.purchaseDate.getTime()))
    throw new ReceiptOcrDataError('Receipt date is invalid.');
  if (typeof result.storeName !== 'string' || !result.storeName.trim())
    throw new ReceiptOcrDataError('Receipt store name is required.');
  if (typeof result.currency !== 'string' || !/^[A-Z]{3}$/.test(result.currency))
    throw new ReceiptOcrDataError('Receipt currency is invalid.');
  assertDecimal(result.total, 'Receipt total', false);
  if (!Array.isArray(result.items) || result.items.length === 0)
    throw new ReceiptOcrDataError('The receipt contains no purchase items.');
  if (
    result.confidence !== null &&
    (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1)
  )
    throw new ReceiptOcrDataError('Receipt confidence is invalid.');
  if (
    !Array.isArray(result.warnings) ||
    result.warnings.some((warning) => typeof warning !== 'string' || !warning.trim())
  )
    throw new ReceiptOcrDataError('Receipt warnings are invalid.');
  if (typeof result.reviewRequired !== 'boolean')
    throw new ReceiptOcrDataError('Receipt review flag is invalid.');
  for (const item of result.items) {
    if (
      !item ||
      typeof item.name !== 'string' ||
      typeof item.unit !== 'string' ||
      !item.name.trim() ||
      !item.unit.trim()
    )
      throw new ReceiptOcrDataError('Receipt item name and unit are required.');
    assertDecimal(item.quantity, 'Receipt item quantity', true);
    if (item.unitPrice !== null) assertDecimal(item.unitPrice, 'Receipt item unit price', false);
    if (item.discount !== null) assertDecimal(item.discount, 'Receipt item discount', false);
    if (item.total !== null) assertDecimal(item.total, 'Receipt item total', false);
  }
}

function assertDecimal(value: string, label: string, mustBePositive: boolean): void {
  if (typeof value !== 'string') throw new ReceiptOcrDataError(`${label} is invalid.`);
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new ReceiptOcrDataError(`${label} is invalid.`);
  }
  if (!decimal.isFinite() || (mustBePositive ? decimal.lte(0) : decimal.isNegative()))
    throw new ReceiptOcrDataError(`${label} is invalid.`);
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
