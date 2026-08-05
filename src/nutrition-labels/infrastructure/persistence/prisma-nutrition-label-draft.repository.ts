import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { NutritionLabelDraft } from '../../domain/models/nutrition-label-draft';
import {
  CreateNutritionLabelDraftInput,
  NutritionLabelDraftRepository,
} from '../../application/ports/nutrition-label-draft.repository';

@Injectable()
export class PrismaNutritionLabelDraftRepository implements NutritionLabelDraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnexpiredByHash(householdId: string, hash: string, now: Date) {
    const draft = await this.prisma.nutritionLabelDraft.findFirst({
      where: { householdId, documentHash: hash, expiresAt: { gt: now } },
    });
    return draft ? mapDraft(draft) : null;
  }

  async findById(id: string, householdId: string) {
    const draft = await this.prisma.nutritionLabelDraft.findFirst({ where: { id, householdId } });
    return draft ? mapDraft(draft) : null;
  }

  async saveReplacingExpired(input: CreateNutritionLabelDraftInput) {
    const data = {
      createdById: input.createdById,
      status: 'PENDING_REVIEW' as const,
      name: input.name,
      brand: input.brand,
      packageQuantity: input.packageQuantity,
      packageUnit: input.packageUnit,
      extractedData: input.extractedData as unknown as Prisma.InputJsonValue,
      warnings: input.warnings,
      missingFields: input.missingFields,
      rawText: input.rawText,
      confidence: input.confidence,
      expiresAt: input.expiresAt,
      confirmedById: null,
      confirmedAt: null,
      confirmedFoodId: null,
    };
    const replaced = await this.prisma.nutritionLabelDraft.updateMany({
      where: {
        householdId: input.householdId,
        documentHash: input.documentHash,
        status: 'PENDING_REVIEW',
        expiresAt: { lte: input.now },
      },
      data,
    });
    if (replaced.count) {
      const updated = await this.prisma.nutritionLabelDraft.findUniqueOrThrow({
        where: {
          householdId_documentHash: {
            householdId: input.householdId,
            documentHash: input.documentHash,
          },
        },
      });
      return mapDraft(updated);
    }
    const concurrent = await this.prisma.nutritionLabelDraft.findUnique({
      where: {
        householdId_documentHash: {
          householdId: input.householdId,
          documentHash: input.documentHash,
        },
      },
    });
    if (concurrent) return mapDraft(concurrent);
    try {
      return mapDraft(
        await this.prisma.nutritionLabelDraft.create({
          data: { ...data, householdId: input.householdId, documentHash: input.documentHash },
        }),
      );
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const raced = await this.prisma.nutritionLabelDraft.findUniqueOrThrow({
        where: {
          householdId_documentHash: {
            householdId: input.householdId,
            documentHash: input.documentHash,
          },
        },
      });
      return mapDraft(raced);
    }
  }
}

interface DraftRecord {
  id: string;
  householdId: string;
  createdById: string;
  documentHash: string;
  status: string;
  name: string | null;
  brand: string | null;
  packageQuantity: { toString(): string } | null;
  packageUnit: string | null;
  extractedData: unknown;
  warnings: unknown;
  missingFields: unknown;
  rawText: string;
  confidence: { toNumber(): number } | null;
  expiresAt: Date;
  confirmedAt: Date | null;
  confirmedFoodId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapDraft(value: DraftRecord): NutritionLabelDraft {
  return {
    ...value,
    status: value.status as NutritionLabelDraft['status'],
    packageQuantity: value.packageQuantity?.toString() ?? null,
    packageUnit: value.packageUnit as NutritionLabelDraft['packageUnit'],
    extractedData: value.extractedData as NutritionLabelDraft['extractedData'],
    warnings: Array.isArray(value.warnings) ? (value.warnings as string[]) : [],
    missingFields: Array.isArray(value.missingFields) ? (value.missingFields as string[]) : [],
    confidence: value.confidence?.toNumber() ?? null,
  };
}
