import crypto from 'node:crypto';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import {
  ObjectStorage,
  StoredObject,
} from '../../../storage/application/ports/object-storage.port';
import { NutritionLabelDraft } from '../../domain/models/nutrition-label-draft';
import {
  getNutritionLabelMissingFields,
  validateAndReviewNutritionLabelExtraction,
} from '../../domain/services/validate-nutrition-label-extraction';
import {
  NutritionLabelAccessDeniedError,
  NutritionLabelFileError,
  NutritionLabelFileTooLargeError,
} from '../errors/nutrition-label.errors';
import { NutritionLabelDraftRepository } from '../ports/nutrition-label-draft.repository';
import { NutritionLabelExtractionPort } from '../ports/nutrition-label-extraction.port';

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export class CreateNutritionLabelDraftUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly drafts: NutritionLabelDraftRepository,
    private readonly extraction: NutritionLabelExtractionPort,
    private readonly storage: ObjectStorage,
    private readonly maxSizeBytes = DEFAULT_MAX_SIZE,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    actorId: string;
    householdId: string;
    content: Buffer;
    fileName: string;
    contentType: string;
    name?: string;
    brand?: string;
    packageQuantity?: string;
    packageUnit?: 'GRAM' | 'MILLILITER';
  }): Promise<NutritionLabelDraft> {
    const access = await this.households.findAccess(input.actorId, input.householdId);
    if (!access || access.status !== 'ACTIVE') throw new NutritionLabelAccessDeniedError();
    validateDocument(input.content, input.fileName, input.contentType, this.maxSizeBytes);
    validatePackage(input.packageQuantity, input.packageUnit);

    const currentTime = this.now();
    const hash = crypto.createHash('sha256').update(input.content).digest('hex');
    const existing = await this.drafts.findUnexpiredByHash(input.householdId, hash, currentTime);
    if (existing) return existing;

    const key = `households/${encodeURIComponent(input.householdId)}/nutrition-labels/${crypto.randomUUID()}`;
    let stored: StoredObject | undefined;
    try {
      stored = await this.storage.upload({
        key,
        body: input.content,
        contentType: input.contentType,
        metadata: { 'original-name': encodeURIComponent(input.fileName) },
      });
      const result = await this.extraction.extract({
        content: input.content,
        contentType: input.contentType,
      });
      const extractedData = validateAndReviewNutritionLabelExtraction(result);
      return await this.drafts.saveReplacingExpired({
        householdId: input.householdId,
        createdById: input.actorId,
        documentHash: hash,
        name: normalize(input.name) ?? extractedData.product_name,
        brand: normalize(input.brand) ?? extractedData.brand,
        packageQuantity:
          input.packageQuantity ??
          (extractedData.net_content.value == null
            ? null
            : String(extractedData.net_content.value)),
        packageUnit: input.packageUnit ?? toBaseUnit(extractedData.net_content.unit),
        extractedData,
        warnings: extractedData.warnings,
        missingFields: getNutritionLabelMissingFields(extractedData),
        rawText: JSON.stringify(extractedData),
        confidence: extractedData.confidence,
        expiresAt: new Date(currentTime.getTime() + DRAFT_LIFETIME_MS),
        now: currentTime,
      });
    } finally {
      if (stored) await this.storage.delete(stored.key);
    }
  }
}

export function validateDocument(
  content: Buffer,
  fileName: string,
  contentType: string,
  maxSizeBytes: number,
): void {
  if (!content.length) throw new NutritionLabelFileError('Nutrition label file is required.');
  if (content.length > maxSizeBytes) throw new NutritionLabelFileTooLargeError();
  if (!fileName.trim()) throw new NutritionLabelFileError('Nutrition label file name is required.');
  if (!CONTENT_TYPES.has(contentType) || !matchesSignature(content, contentType)) {
    throw new NutritionLabelFileError('Unsupported nutrition label file.');
  }
}

function matchesSignature(content: Buffer, contentType: string): boolean {
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
  const brand = content.subarray(8, 12).toString();
  return (
    content.subarray(4, 8).toString() === 'ftyp' &&
    ['heic', 'heif', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)
  );
}

function validatePackage(quantity?: string, unit?: string): void {
  if ((quantity === undefined) !== (unit === undefined)) {
    throw new NutritionLabelFileError('Package quantity and unit must be provided together.');
  }
  if (quantity !== undefined && (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) {
    throw new NutritionLabelFileError('Package quantity must be positive.');
  }
}

function normalize(value?: string): string | null {
  return value?.trim() || null;
}

function toBaseUnit(unit: 'g' | 'ml' | null): 'GRAM' | 'MILLILITER' | null {
  if (unit === 'g') return 'GRAM';
  if (unit === 'ml') return 'MILLILITER';
  return null;
}
